import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Document } from 'mongodb';
import { anyCol, getDb } from '../../db/mongo.js';
import { resolveOrgPartitionDbName, resolveDefinitionsDb } from '../../db/resolver.js';
import {
  resolveAppUserContext,
  passesL3,
  resolveCallerTeams,
  getTeamAccess,
  type AppUserDoc,
  type TeamRbacMatrix,
} from './rbac-filter.js';

export interface ActionResult {
  availableActions: Action[];
  alternateNextActions: Action[];
  linkedSmActions: Action[];
}

export interface Action {
  type: 'state' | 'subState' | 'microState' | 'linkedSM';
  label: string;
  targetState: string;
  targetSubState: string | null;
  targetMicroState: string | null;
  smId?: string;
}

/**
 * Core action computation algorithm (8 steps from Architecture Plan Section 3.4).
 * Exported for inline use in documents.handler.ts.
 */
export async function computeActions(
  doc: Document,
  appUser: AppUserDoc,
  teamRbacMatrix: TeamRbacMatrix,
  callerOrgParamId: string,
  defsDbName: string,
): Promise<ActionResult> {
  const result: ActionResult = {
    availableActions: [],
    alternateNextActions: [],
    linkedSmActions: [],
  };

  // Step 1: L3 check — if blocked, return empty
  const docPlants = (doc['_chain']?.['_sys']?.['plantIDs']?.[callerOrgParamId] as string[]) ?? [];
  const teams = resolveCallerTeams(appUser, callerOrgParamId, docPlants);
  if (!passesL3(doc, appUser.userId, appUser.role, teams)) {
    return result;
  }

  // Step 2: Parse current state from chain_head
  const state = doc['_local']?.['state'] as string | undefined;
  const subState = (doc['_local']?.['subState'] as string | null | undefined) ?? null;
  const microState = (doc['_local']?.['microState'] as string | null | undefined) ?? null;

  if (!state) return result;

  // Step 3: Load SM definition
  const smId = teamRbacMatrix.smId;
  const smDef = await anyCol(defsDbName, 'onchain_sm_definitions').findOne({ _id: smId });
  if (!smDef) return result;

  const states = smDef['states'] as Record<string, Record<string, unknown>> | undefined ?? {};
  const currentStateDef = states[state];
  if (!currentStateDef) return result;

  // Helper: check L1 (owner contains caller's role)
  const passesL1 = (ownerList: string[] | undefined): boolean =>
    (ownerList ?? []).includes(appUser.role);

  // Helper: check L2 (team has RW at target level)
  const passesL2 = (targetState: string, targetSubState: string | null, targetMicroState: string | null): boolean => {
    for (const team of teams) {
      const access = getTeamAccess(
        teamRbacMatrix.permissions, appUser.role, team,
        targetState, targetSubState, targetMicroState,
      );
      if (access === 'RW') return true;
    }
    return false;
  };

  // Helper: resolve full landing position for a state transition
  const resolveLanding = (
    targetState: string,
    targetSubState?: string | null,
    targetMicroState?: string | null,
  ): { targetState: string; targetSubState: string | null; targetMicroState: string | null } => {
    if (targetSubState !== undefined && targetSubState !== null) {
      // SubState transition — find start microState
      const subDef = states[targetState]?.['subStates'] as Record<string, Record<string, unknown>> | undefined;
      const startMicro = subDef
        ? Object.entries(subDef[targetSubState]?.['microStates'] as Record<string, Record<string, unknown>> ?? {})
            .find(([, v]) => v['start'])?.[0] ?? null
        : null;
      return { targetState, targetSubState, targetMicroState: targetMicroState ?? startMicro };
    }

    // Full state transition
    const targetStateDef = states[targetState];
    if (!targetStateDef) return { targetState, targetSubState: null, targetMicroState: null };

    const subStates = targetStateDef['subStates'] as Record<string, Record<string, unknown>> | undefined ?? {};
    const startSubState = Object.entries(subStates).find(([, v]) => v['start'])?.[0] ?? null;
    if (!startSubState) return { targetState, targetSubState: null, targetMicroState: null };

    const microStates = subStates[startSubState]?.['microStates'] as Record<string, Record<string, unknown>> | undefined ?? {};
    const startMicroState = Object.entries(microStates).find(([, v]) => v['start'])?.[0] ?? null;

    return { targetState, targetSubState: startSubState, targetMicroState: startMicroState };
  };

  // Step 4-7: Collect transitions

  // Primary nextState transition
  const nextState = currentStateDef['nextState'] as string | null | undefined;
  if (nextState) {
    const owner = currentStateDef['owner'] as string[] | undefined;
    if (passesL1(owner)) {
      const landing = resolveLanding(nextState);
      if (passesL2(landing.targetState, landing.targetSubState, landing.targetMicroState)) {
        result.availableActions.push({ type: 'state', label: nextState, ...landing });
      }
    }
  }

  // Alternate next state transitions
  const alternateNext = (currentStateDef['alternateNext'] as string[] | undefined) ?? [];
  for (const alt of alternateNext) {
    const owner = currentStateDef['owner'] as string[] | undefined;
    if (passesL1(owner)) {
      const landing = resolveLanding(alt);
      if (passesL2(landing.targetState, landing.targetSubState, landing.targetMicroState)) {
        result.alternateNextActions.push({ type: 'state', label: alt, ...landing });
      }
    }
  }

  // SubState transition
  if (subState) {
    const subStates = currentStateDef['subStates'] as Record<string, Record<string, unknown>> | undefined ?? {};
    const subStateDef = subStates[subState];
    if (subStateDef) {
      const subNextState = subStateDef['nextState'] as string | null | undefined;
      if (subNextState) {
        const owner = subStateDef['owner'] as string[] | undefined;
        if (passesL1(owner)) {
          const landing = resolveLanding(state, subNextState);
          if (passesL2(landing.targetState, landing.targetSubState, landing.targetMicroState)) {
            result.availableActions.push({ type: 'subState', label: subNextState, ...landing });
          }
        }
      }

      // MicroState transition
      if (microState) {
        const microStates = subStateDef['microStates'] as Record<string, Record<string, unknown>> | undefined ?? {};
        const microStateDef = microStates[microState];
        if (microStateDef) {
          const microNextState = microStateDef['nextState'] as string | null | undefined;
          if (microNextState) {
            const owner = microStateDef['owner'] as string[] | undefined;
            if (passesL1(owner)) {
              const landing = { targetState: state, targetSubState: subState, targetMicroState: microNextState };
              if (passesL2(landing.targetState, landing.targetSubState, landing.targetMicroState)) {
                result.availableActions.push({ type: 'microState', label: microNextState, ...landing });
              }
            }
          }
        }
      }
    }
  }

  // LinkedSM transitions
  const linkedSMs = (currentStateDef['linkedSMs'] as string[] | undefined) ?? [];
  for (const linkedSmRef of linkedSMs) {
    // linkedSmRef format: "{smType}:{_id}"
    const linkedSmId = linkedSmRef.includes(':') ? linkedSmRef.split(':').slice(1).join(':') : linkedSmRef;
    const linkedSmDef = await anyCol(defsDbName, 'onchain_sm_definitions').findOne({ _id: linkedSmId });
    if (!linkedSmDef) continue;

    const linkedStartAt = linkedSmDef['startAt'] as string | undefined;
    if (!linkedStartAt) continue;

    const owner = (linkedSmDef['states'] as Record<string, Record<string, unknown>>)?.[linkedStartAt]?.['owner'] as string[] | undefined;
    if (!passesL1(owner)) continue;

    const landing = resolveLanding(linkedStartAt);
    if (passesL2(landing.targetState, landing.targetSubState, landing.targetMicroState)) {
      result.linkedSmActions.push({
        type: 'linkedSM',
        label: linkedSmDef['name'] as string ?? linkedSmId,
        smId: linkedSmId,
        ...landing,
      });
    }
  }

  return result;
}

async function getDocumentActions(
  request: FastifyRequest<{ Params: { docId: string }; Querystring: { smId?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { docId } = request.params;
  const { superAppId, superAppDbName, workspace } = request.requestContext;
  const { userId, paramId: callerOrgParamId } = request.authContext;
  const { role } = request.platformContext;

  if (!superAppId || !superAppDbName || !workspace) {
    return reply.code(400).send({ error: 'X-SuperApp-ID and X-Workspace headers required' });
  }

  const portal = request.headers['x-portal'] as string | undefined ?? role;
  const orgPartDbName = resolveOrgPartitionDbName(workspace, superAppId, callerOrgParamId, portal);
  const defsDbName = resolveDefinitionsDb();

  // Find document across sm_* collections
  const colNames = await getDb(orgPartDbName).listCollections({ name: /^sm_/ }).toArray();
  let doc: Document | null = null;
  for (const { name } of colNames) {
    doc = await anyCol(orgPartDbName, name).findOne({ _id: docId });
    if (doc) break;
  }
  if (!doc) return reply.code(404).send({ error: 'Document not found' });

  const appUsersCol = anyCol(superAppDbName, 'app_users');
  const appUser = await resolveAppUserContext(
    appUsersCol, userId, superAppId, callerOrgParamId, doc,
  );
  if (!appUser) return reply.code(403).send({ error: 'Access denied' });

  const smId = request.query.smId ?? (doc['_local']?.['smId'] as string | undefined);
  if (!smId) return reply.code(400).send({ error: 'smId required' });

  const rbacMatrixId = `${superAppId.slice(0, 8)}:${smId}`;
  const teamRbacMatrix = await anyCol(superAppDbName, 'team_rbac_matrix').findOne({ _id: rbacMatrixId }) as TeamRbacMatrix | null;
  if (!teamRbacMatrix) return reply.code(404).send({ error: 'Team RBAC matrix not found' });

  const actions = await computeActions(doc, appUser, teamRbacMatrix, callerOrgParamId, defsDbName);
  return reply.send(actions);
}

export async function actionsHandlers(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { docId: string }; Querystring: { smId?: string } }>('/documents/:docId/actions', getDocumentActions);
}

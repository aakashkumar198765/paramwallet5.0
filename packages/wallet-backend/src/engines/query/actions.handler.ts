import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/mongo.js';
import {
  resolveDefinitionsDb,
  resolveOrgPartitionDbName,
  resolveSuperAppDbName,
} from '../../db/resolver.js';
import {
  resolveAppUserContext,
  passesL3,
  resolveCallerTeams,
  getTeamAccess,
  getDocPlantCodes,
  AppUser,
} from './rbac-filter.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';
import type { PlatformContext } from '../../middleware/platform-context.js';

interface DocParams {
  docId: string;
}

// ── SM Definition Types ───────────────────────────────────────────────────────

interface SmNextState {
  state?: string;   // target state name (may be the string itself or an object)
  label?: string;
  owner?: string[];
}

interface SmMicroState {
  start?: boolean;
  end?: boolean;
  nextState?: string | SmNextState | null;
  owner?: string[];
}

interface SmSubState {
  start?: boolean;
  end?: boolean;
  nextState?: string | SmNextState | null;
  owner?: string[];
  microStates?: Record<string, SmMicroState>;
}

interface SmState {
  desc?: string;
  phase?: string;
  end?: boolean;
  owner?: string[];
  nextState?: string | SmNextState | null;
  alternateNext?: Array<string | SmNextState>;
  linkedSMs?: Array<string | { smId: string; label?: string; startAt?: string }>;
  subStates?: Record<string, SmSubState>;
}

// ── Action response shape (Spec §16.1) ───────────────────────────────────────

interface ActionItem {
  type: 'state_transition' | 'substate_transition' | 'microstate_transition' | 'create_linked_doc';
  label: string;
  targetState: string;
  targetSubState: string | null;
  targetMicroState: string | null;
  smId: string;
  smName?: string;    // only for linkedSmActions
  canCreate?: boolean;
  remainingQty?: number;
  diffReason?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveNextStateStr(next: string | SmNextState | null | undefined): { state: string; label: string; owner?: string[] } | null {
  if (!next) return null;
  if (typeof next === 'string') return { state: next, label: next };
  if (next.state) return { state: next.state, label: next.label ?? next.state, owner: next.owner };
  return null;
}

/**
 * Resolve the start subState and its start microState for a given target state.
 */
function resolveStartSubState(
  states: Record<string, SmState>,
  targetState: string
): { subState: string | null; microState: string | null } {
  const stateDef = states[targetState];
  if (!stateDef?.subStates) return { subState: null, microState: null };

  const startSubEntry = Object.entries(stateDef.subStates).find(([, ss]) => ss.start);
  if (!startSubEntry) return { subState: null, microState: null };

  const [startSubState, startSubDef] = startSubEntry;
  const microState = resolveStartMicroState(startSubDef);
  return { subState: startSubState, microState };
}

function resolveStartMicroState(subStateDef: SmSubState): string | null {
  if (!subStateDef.microStates) return null;
  const startMsEntry = Object.entries(subStateDef.microStates).find(([, ms]) => ms.start);
  return startMsEntry ? startMsEntry[0] : null;
}

/**
 * Compute diff info for child-creating actions.
 * Returns: { canCreate, remainingQty, diffReason }
 */
async function computeDiffForAction(
  orgDb: ReturnType<typeof getDb>,
  doc: Record<string, unknown>,
  foundCollection: string
): Promise<{ canCreate: boolean; remainingQty: number | null; diffReason: string | undefined }> {
  const chain = doc._chain as Record<string, unknown> | undefined;
  const refs = chain?.refs as Record<string, unknown> | undefined;
  const childDocIds: string[] = (refs?.docIds as string[]) ?? [];

  const parentItems = (doc['OrderedItems'] as Array<Record<string, unknown>>) ?? [];
  const hasOrderedItems = parentItems.length > 0;

  if (hasOrderedItems) {
    const remaining = new Map<string, number>();
    let parentTotal = 0;
    for (const item of parentItems) {
      const sku = item.I_SKU as string;
      const qty = (item.I_Quantity as number) ?? 0;
      if (sku) { remaining.set(sku, (remaining.get(sku) ?? 0) + qty); parentTotal += qty; }
    }

    if (childDocIds.length > 0) {
      const childDocs = await orgDb
        .collection(foundCollection)
        .find({ _id: { $in: childDocIds as unknown[] } })
        .toArray();

      for (const childDoc of childDocs) {
        const childItems = (childDoc['OrderedItems'] as Array<Record<string, unknown>>) ?? [];
        for (const item of childItems) {
          const sku = item.I_SKU as string;
          const qty = (item.I_Quantity as number) ?? 0;
          if (sku && remaining.has(sku)) {
            remaining.set(sku, (remaining.get(sku) ?? 0) - qty);
          }
        }
      }
    }

    const remainingQty = Array.from(remaining.values()).reduce((s, v) => s + v, 0);
    if (remainingQty > 0) {
      return { canCreate: true, remainingQty, diffReason: undefined };
    } else {
      return { canCreate: false, remainingQty: 0, diffReason: 'quantity_exhausted' };
    }
  } else {
    // No OrderedItems — child allowed only if no children yet
    if (childDocIds.length === 0) {
      return { canCreate: true, remainingQty: null, diffReason: undefined };
    } else {
      return { canCreate: false, remainingQty: null, diffReason: 'child_exists' };
    }
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────

/**
 * GET /documents/:docId/actions
 * Spec §16.1: 8-step algorithm to resolve available actions for caller.
 * Response: { currentState, currentSubState, currentMicroState, availableActions, alternateNextActions, linkedSmActions }
 */
export async function getDocumentActions(
  request: FastifyRequest<{ Params: DocParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: DocParams }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
    platformContext: PlatformContext | null;
  };

  const { workspace, superAppId, portal, superAppDbName } = req.requestContext;
  if (!workspace || !superAppId || !portal) {
    return reply.status(400).send({ error: 'X-Workspace, X-SuperApp-ID and X-Portal headers required' });
  }

  if (!req.platformContext) {
    return reply.status(403).send({ error: 'Access denied' });
  }

  const { docId } = request.params;
  const callerOrgParamId = req.authContext.paramId;
  const orgPartitionDbName = resolveOrgPartitionDbName(workspace, superAppId, callerOrgParamId, portal);
  const orgDb = getDb(orgPartitionDbName);
  const sappDb = getDb(superAppDbName!);
  const defsDb = getDb(resolveDefinitionsDb());

  // Find document
  let doc: Record<string, unknown> | null = null;
  let foundCollection = '';

  try {
    const colList = await orgDb.listCollections().toArray();
    const smCollections = colList.map(c => c.name).filter(n => n.startsWith('sm_'));
    for (const colName of smCollections) {
      const found = await orgDb.collection(colName).findOne({ _id: docId as unknown as string });
      if (found) { doc = found as Record<string, unknown>; foundCollection = colName; break; }
    }
  } catch {
    return reply.status(404).send({ error: 'Document not found' });
  }

  if (!doc) return reply.status(404).send({ error: 'Document not found' });

  // Resolve app user context and caller teams
  const appUserDoc = await resolveAppUserContext(
    sappDb.collection('app_users'),
    req.authContext.userId,
    superAppId,
    callerOrgParamId,
    doc
  );

  if (!appUserDoc) return reply.status(403).send({ error: 'Access denied' });

  const docPlants = getDocPlantCodes(doc, callerOrgParamId);
  const callerTeams = resolveCallerTeams(appUserDoc as AppUser, callerOrgParamId, docPlants);

  // Step 2: Parse chain_head state
  const chainHead = await orgDb
    .collection('chain_head')
    .findOne({ _id: docId as unknown as string }) as Record<string, unknown> | null;

  const local = doc._local as Record<string, unknown> | undefined;
  const rawStateTo = (chainHead?.stateTo ?? local?.state ?? '') as string;
  // stateTo format: "State:SubState~MicroState" or "State:SubState" or "State"
  const [statePart, subStatePart] = rawStateTo.split(':');
  const currentState = statePart ?? '';
  const currentSubState = (subStatePart?.split('~')[0]) ?? (local?.subState as string | null) ?? null;
  const currentMicroState = (subStatePart?.split('~')[1]) ?? (local?.microState as string | null) ?? null;

  // Step 1 (moved here): L3 check — spec §3.3: pass if ANY of caller's teams passes L3
  const callerRole = req.platformContext.role;
  const teamsToCheck = callerTeams.length > 0 ? callerTeams : [''];
  const blockedByL3 = teamsToCheck.every(team => !passesL3(doc, req.authContext.userId, callerRole, team));
  if (blockedByL3) {
    // Spec §16.1 step 1: return blocked response (NOT 403)
    return reply.send({
      blocked: true,
      currentState,
      currentSubState,
      currentMicroState,
      availableActions: [],
      alternateNextActions: [],
      linkedSmActions: [],
    });
  }

  // Step 3: Load SM definition
  const docSmId = (doc._chain as Record<string, unknown>)?.smId as string | undefined;
  if (!docSmId) {
    return reply.send({
      currentState,
      currentSubState,
      currentMicroState,
      availableActions: [],
      alternateNextActions: [],
      linkedSmActions: [],
    });
  }

  const smDef = await defsDb
    .collection('onchain_sm_definitions')
    .findOne({ _id: docSmId as unknown as string }) as Record<string, unknown> | null;

  if (!smDef) {
    return reply.send({
      currentState,
      currentSubState,
      currentMicroState,
      availableActions: [],
      alternateNextActions: [],
      linkedSmActions: [],
    });
  }

  // Load team RBAC matrix
  const rbacId = `${superAppId.slice(0, 8)}:${docSmId}`;
  const teamRbacMatrix = await sappDb
    .collection('team_rbac_matrix')
    .findOne({ _id: rbacId as unknown as string }) as Record<string, unknown> | null;

  const states = (smDef.states ?? {}) as Record<string, SmState>;
  const stateDef = states[currentState];

  const availableActions: ActionItem[] = [];
  const alternateNextActions: ActionItem[] = [];
  const linkedSmActionsArr: ActionItem[] = [];

  // Pre-compute diff info (for child-creating actions)
  const diffInfo = await computeDiffForAction(orgDb, doc, foundCollection);

  // ── Step 4: Collect candidate transitions ────────────────────────────────

  // (a) State-level nextState → availableActions
  if (stateDef?.nextState && !stateDef.end) {
    const next = resolveNextStateStr(stateDef.nextState as string | SmNextState);
    if (next) {
      const ownerOk = passesOwnerCheck(stateDef.owner, callerRole);
      // HIGH-13 fix: L2 check must use resolved landing position (targetState + startSubState + startMicroState)
      const { subState, microState } = resolveStartSubState(states, next.state);
      if (ownerOk && passesL2Check(teamRbacMatrix, callerTeams, callerRole, next.state, subState, microState)) {
        const action: ActionItem = {
          type: 'state_transition',
          label: next.label,
          targetState: next.state,
          targetSubState: subState,
          targetMicroState: microState,
          smId: docSmId,
        };
        applyDiffInfo(action, diffInfo);
        availableActions.push(action);
      }
    }
  }

  // (b) State-level alternateNext[] → alternateNextActions
  for (const altNext of (stateDef?.alternateNext ?? [])) {
    const next = resolveNextStateStr(altNext as string | SmNextState);
    if (!next) continue;
    const ownerOk = passesOwnerCheck(stateDef?.owner, callerRole);
    // HIGH-13 fix: L2 check must use resolved landing position (targetState + startSubState + startMicroState)
    const { subState, microState } = resolveStartSubState(states, next.state);
    if (ownerOk && passesL2Check(teamRbacMatrix, callerTeams, callerRole, next.state, subState, microState)) {
      const action: ActionItem = {
        type: 'state_transition',
        label: next.label,
        targetState: next.state,
        targetSubState: subState,
        targetMicroState: microState,
        smId: docSmId,
      };
      applyDiffInfo(action, diffInfo);
      alternateNextActions.push(action);
    }
  }

  // (c) SubState-level nextState → availableActions (if subState is active)
  if (currentSubState) {
    const subStateDef = stateDef?.subStates?.[currentSubState];
    if (subStateDef?.nextState) {
      const next = resolveNextStateStr(subStateDef.nextState as string | SmNextState);
      if (next) {
        const ownerOk = passesOwnerCheck(subStateDef.owner, callerRole);
        if (ownerOk && passesL2Check(teamRbacMatrix, callerTeams, callerRole, currentState, next.state, null)) {
          // Spec step 7: SubState transition: targetState = currentState; resolve start microState
          const targetSubStateDef = stateDef?.subStates?.[next.state];
          const microState = targetSubStateDef ? resolveStartMicroState(targetSubStateDef) : null;
          availableActions.push({
            type: 'substate_transition',
            label: next.label,
            targetState: currentState,
            targetSubState: next.state,
            targetMicroState: microState,
            smId: docSmId,
          });
        }
      }
    }

    // (d) MicroState-level nextState → availableActions (if microState is active)
    if (currentMicroState) {
      const microStateDef = stateDef?.subStates?.[currentSubState]?.microStates?.[currentMicroState];
      if (microStateDef?.nextState) {
        const next = resolveNextStateStr(microStateDef.nextState as string | SmNextState);
        if (next) {
          const ownerOk = passesOwnerCheck(microStateDef.owner, callerRole);
          if (ownerOk && passesL2Check(teamRbacMatrix, callerTeams, callerRole, currentState, currentSubState, next.state)) {
            availableActions.push({
              type: 'microstate_transition',
              label: next.label,
              targetState: currentState,
              targetSubState: currentSubState,
              targetMicroState: next.state,
              smId: docSmId,
            });
          }
        }
      }
    }
  }

  // (e) State-level linkedSMs[] → linkedSmActions
  for (const linked of (stateDef?.linkedSMs ?? [])) {
    let linkedSmId: string;
    let linkedLabel: string;
    let linkedStartAt: string | undefined;

    if (typeof linked === 'string') {
      linkedSmId = linked;
      linkedLabel = linked;
    } else {
      linkedSmId = linked.smId;
      linkedLabel = linked.label ?? linked.smId;
      linkedStartAt = linked.startAt;
    }

    // Owner check at state level
    if (!passesOwnerCheck(stateDef?.owner, callerRole)) continue;

    // Fetch linked SM definition to get startAt state
    const linkedSmDef = await defsDb
      .collection('onchain_sm_definitions')
      .findOne({ _id: linkedSmId as unknown as string }) as Record<string, unknown> | null;

    const targetState = linkedStartAt ?? (linkedSmDef?.startAt as string) ?? '';
    const linkedSmName = (linkedSmDef?.name ?? linkedSmDef?.displayName ?? linkedSmId) as string;
    const linkedStates = (linkedSmDef?.states ?? {}) as Record<string, SmState>;
    const { subState: targetSubState, microState: targetMicroState } = resolveStartSubState(linkedStates, targetState);

    if (!passesL2Check(teamRbacMatrix, callerTeams, callerRole, targetState, targetSubState, targetMicroState)) continue;

    const action: ActionItem = {
      type: 'create_linked_doc',
      label: linkedLabel,
      smId: linkedSmId,
      smName: linkedSmName,
      targetState,
      targetSubState,
      targetMicroState,
    };
    applyDiffInfo(action, diffInfo);
    linkedSmActionsArr.push(action);
  }

  // Spec §16.1 response
  return reply.send({
    currentState,
    currentSubState,
    currentMicroState,
    availableActions,
    alternateNextActions,
    linkedSmActions: linkedSmActionsArr,
  });
}

// ── Exported types ────────────────────────────────────────────────────────────

export type { ActionItem };

export interface ActionsBlock {
  currentState: string;
  currentSubState: string | null;
  currentMicroState: string | null;
  blocked?: boolean;
  availableActions: ActionItem[];
  alternateNextActions: ActionItem[];
  linkedSmActions: ActionItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// CRIT-3 fix: removed broken local getDocPlantCodes that read _chain.plant / _chain.plants.
// Now uses getDocPlantCodes imported from rbac-filter which correctly reads _chain._sys.plantIDs.

function passesOwnerCheck(owner: string[] | undefined, callerRole: string): boolean {
  if (!owner || owner.length === 0) return true;
  return owner.includes(callerRole);
}

function passesL2Check(
  teamRbacMatrix: Record<string, unknown> | null,
  callerTeams: string[],
  callerRole: string,
  targetState: string,
  targetSubState: string | null,
  targetMicroState: string | null
): boolean {
  if (!teamRbacMatrix) return true; // No matrix = allow
  for (const team of callerTeams) {
    const access = getTeamAccess(
      teamRbacMatrix,
      callerRole,
      team,
      targetState,
      targetSubState,
      targetMicroState
    );
    if (access === 'RW') return true;
  }
  return false;
}

/**
 * Apply diff info to child-creating actions (state_transition, create_linked_doc).
 * Spec §16.1: canCreate + remainingQty/diffReason added to these action types.
 * substate_transition and microstate_transition are NEVER affected by diff.
 */
function applyDiffInfo(
  action: ActionItem,
  diffInfo: { canCreate: boolean; remainingQty: number | null; diffReason: string | undefined }
): void {
  if (action.type === 'state_transition' || action.type === 'create_linked_doc') {
    action.canCreate = diffInfo.canCreate;
    if (diffInfo.canCreate && diffInfo.remainingQty !== null) {
      action.remainingQty = diffInfo.remainingQty;
    }
    if (!diffInfo.canCreate && diffInfo.diffReason) {
      action.diffReason = diffInfo.diffReason;
    }
  }
}

// ── Exported helper for include_actions in listDocuments ─────────────────────

/**
 * HIGH-7 helper: Compute the full actions block for a single document.
 * All DB-dependent context (smDef, teamRbacMatrix, chainHead) must be pre-fetched
 * by the caller so listDocuments can batch them across all docs efficiently.
 */
export async function computeActionsBlock(
  doc: Record<string, unknown>,
  docSmId: string,
  appUser: AppUser,
  callerRole: string,
  callerOrgParamId: string,
  chainHead: Record<string, unknown> | null,
  smDef: Record<string, unknown> | null,
  teamRbacMatrix: Record<string, unknown> | null,
  defsDb: ReturnType<typeof getDb>,
  orgDb: ReturnType<typeof getDb>,
  foundCollection: string
): Promise<ActionsBlock> {
  // Parse current state from chain_head
  const local = doc._local as Record<string, unknown> | undefined;
  const rawStateTo = ((chainHead?.stateTo ?? local?.state ?? '') as string);
  const [statePart, subStatePart] = rawStateTo.split(':');
  const currentState = statePart ?? '';
  const currentSubState = (subStatePart?.split('~')[0]) ?? (local?.subState as string | null) ?? null;
  const currentMicroState = (subStatePart?.split('~')[1]) ?? (local?.microState as string | null) ?? null;

  // L3 check
  const docPlants = getDocPlantCodes(doc, callerOrgParamId);
  const callerTeams = resolveCallerTeams(appUser, callerOrgParamId, docPlants);
  const teamsToCheck = callerTeams.length > 0 ? callerTeams : [''];
  const blockedByL3 = teamsToCheck.every(team => !passesL3(doc, appUser.userId, callerRole, team));

  if (blockedByL3) {
    return { blocked: true, currentState, currentSubState, currentMicroState, availableActions: [], alternateNextActions: [], linkedSmActions: [] };
  }

  if (!smDef) {
    return { currentState, currentSubState, currentMicroState, availableActions: [], alternateNextActions: [], linkedSmActions: [] };
  }

  const states = (smDef.states ?? {}) as Record<string, SmState>;
  const stateDef = states[currentState];

  const availableActions: ActionItem[] = [];
  const alternateNextActions: ActionItem[] = [];
  const linkedSmActionsArr: ActionItem[] = [];

  const diffInfo = await computeDiffForAction(orgDb, doc, foundCollection);

  // (a) State-level nextState
  if (stateDef?.nextState && !stateDef.end) {
    const next = resolveNextStateStr(stateDef.nextState as string | SmNextState);
    if (next) {
      const ownerOk = passesOwnerCheck(stateDef.owner, callerRole);
      const { subState, microState } = resolveStartSubState(states, next.state);
      if (ownerOk && passesL2Check(teamRbacMatrix, callerTeams, callerRole, next.state, subState, microState)) {
        const action: ActionItem = { type: 'state_transition', label: next.label, targetState: next.state, targetSubState: subState, targetMicroState: microState, smId: docSmId };
        applyDiffInfo(action, diffInfo);
        availableActions.push(action);
      }
    }
  }

  // (b) State-level alternateNext
  for (const altNext of (stateDef?.alternateNext ?? [])) {
    const next = resolveNextStateStr(altNext as string | SmNextState);
    if (!next) continue;
    const ownerOk = passesOwnerCheck(stateDef?.owner, callerRole);
    const { subState, microState } = resolveStartSubState(states, next.state);
    if (ownerOk && passesL2Check(teamRbacMatrix, callerTeams, callerRole, next.state, subState, microState)) {
      const action: ActionItem = { type: 'state_transition', label: next.label, targetState: next.state, targetSubState: subState, targetMicroState: microState, smId: docSmId };
      applyDiffInfo(action, diffInfo);
      alternateNextActions.push(action);
    }
  }

  // (c) SubState-level nextState
  if (currentSubState) {
    const subStateDef = stateDef?.subStates?.[currentSubState];
    if (subStateDef?.nextState) {
      const next = resolveNextStateStr(subStateDef.nextState as string | SmNextState);
      if (next) {
        const ownerOk = passesOwnerCheck(subStateDef.owner, callerRole);
        if (ownerOk && passesL2Check(teamRbacMatrix, callerTeams, callerRole, currentState, next.state, null)) {
          const targetSubStateDef = stateDef?.subStates?.[next.state];
          const microState = targetSubStateDef ? resolveStartMicroState(targetSubStateDef) : null;
          availableActions.push({ type: 'substate_transition', label: next.label, targetState: currentState, targetSubState: next.state, targetMicroState: microState, smId: docSmId });
        }
      }
    }

    // (d) MicroState-level nextState
    if (currentMicroState) {
      const microStateDef = stateDef?.subStates?.[currentSubState]?.microStates?.[currentMicroState];
      if (microStateDef?.nextState) {
        const next = resolveNextStateStr(microStateDef.nextState as string | SmNextState);
        if (next) {
          const ownerOk = passesOwnerCheck(microStateDef.owner, callerRole);
          if (ownerOk && passesL2Check(teamRbacMatrix, callerTeams, callerRole, currentState, currentSubState, next.state)) {
            availableActions.push({ type: 'microstate_transition', label: next.label, targetState: currentState, targetSubState: currentSubState, targetMicroState: next.state, smId: docSmId });
          }
        }
      }
    }
  }

  // (e) LinkedSMs
  for (const linked of (stateDef?.linkedSMs ?? [])) {
    let linkedSmId: string, linkedLabel: string, linkedStartAt: string | undefined;
    if (typeof linked === 'string') { linkedSmId = linked; linkedLabel = linked; }
    else { linkedSmId = linked.smId; linkedLabel = linked.label ?? linked.smId; linkedStartAt = linked.startAt; }

    if (!passesOwnerCheck(stateDef?.owner, callerRole)) continue;

    const linkedSmDef = await defsDb
      .collection('onchain_sm_definitions')
      .findOne({ _id: linkedSmId as unknown as string }) as Record<string, unknown> | null;

    const targetState = linkedStartAt ?? (linkedSmDef?.startAt as string) ?? '';
    const linkedSmName = (linkedSmDef?.name ?? linkedSmDef?.displayName ?? linkedSmId) as string;
    const linkedStates = (linkedSmDef?.states ?? {}) as Record<string, SmState>;
    const { subState: targetSubState, microState: targetMicroState } = resolveStartSubState(linkedStates, targetState);

    if (!passesL2Check(teamRbacMatrix, callerTeams, callerRole, targetState, targetSubState, targetMicroState)) continue;

    const action: ActionItem = { type: 'create_linked_doc', label: linkedLabel, smId: linkedSmId, smName: linkedSmName, targetState, targetSubState, targetMicroState };
    applyDiffInfo(action, diffInfo);
    linkedSmActionsArr.push(action);
  }

  return { currentState, currentSubState, currentMicroState, availableActions, alternateNextActions, linkedSmActions: linkedSmActionsArr };
}

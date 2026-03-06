import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/mongo.js';
import { resolveSuperAppDbName } from '../../db/resolver.js';
import { UpdateTeamRbacMatrixSchema } from './schemas.js';
import type { RequestContext } from '../../middleware/request-context.js';

interface TeamRbacParams { superAppId: string }
interface TeamRbacSmParams extends TeamRbacParams { smId: string }

/**
 * GET /superapp/:superAppId/team-rbac-matrix
 * Spec §15.7: Array of team_rbac_matrix docs (one per linked SM).
 */
export async function listTeamRbacMatrix(
  request: FastifyRequest<{ Params: TeamRbacParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: TeamRbacParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const sappDb = getDb(resolveSuperAppDbName(workspace, request.params.superAppId));
  const docs = await sappDb.collection('team_rbac_matrix').find({}).toArray();
  // Spec response: array (no wrapper)
  return reply.send(docs);
}

/**
 * GET /superapp/:superAppId/team-rbac-matrix/:smId
 * Spec §15.7: Single team_rbac_matrix document. 404 if not found.
 */
export async function getTeamRbacMatrix(
  request: FastifyRequest<{ Params: TeamRbacSmParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: TeamRbacSmParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId, smId } = request.params;
  const rbacId = `${superAppId.slice(0, 8)}:${smId}`;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));

  const doc = await sappDb
    .collection('team_rbac_matrix')
    .findOne({ _id: rbacId as unknown as string });

  if (!doc) return reply.status(404).send({ error: 'Team RBAC matrix not found' });
  // Spec response: single doc (no wrapper)
  return reply.send(doc);
}

/**
 * PUT /superapp/:superAppId/team-rbac-matrix/:smId
 * Spec §15.7: Full permissions replacement. Sets customizedAt = now().
 */
export async function updateTeamRbacMatrix(
  request: FastifyRequest<{ Params: TeamRbacSmParams }>,
  reply: FastifyReply
): Promise<void> {
  const body = UpdateTeamRbacMatrixSchema.parse(request.body);
  const req = request as FastifyRequest<{ Params: TeamRbacSmParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId, smId } = request.params;
  const rbacId = `${superAppId.slice(0, 8)}:${smId}`;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));

  const result = await sappDb.collection('team_rbac_matrix').findOneAndUpdate(
    { _id: rbacId as unknown as string },
    {
      $set: {
        permissions: body.permissions,
        customizedAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!result) return reply.status(404).send({ error: 'Team RBAC matrix not found' });
  // Spec response: updated doc (no wrapper)
  return reply.send(result);
}

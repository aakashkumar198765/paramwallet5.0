import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { anyCol } from '../../db/mongo.js';
import { resolveSuperAppDbName } from '../../db/resolver.js';
import { UpdateTeamRbacMatrixSchema } from './schemas.js';
import { requireWorkspaceAdmin } from '../../middleware/rbac.js';

// ── Team RBAC Matrix (SuperApp DB copy) ───────────────────────────────────────

async function getMatrix(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId } = request.params;
  const { workspace } = request.requestContext;
  const dbName = resolveSuperAppDbName(workspace, superAppId);
  const docs = await anyCol(dbName, 'team_rbac_matrix').find({}).toArray();
  return reply.send({ matrix: docs });
}

async function getMatrixBySm(
  request: FastifyRequest<{ Params: { superAppId: string; smId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId, smId } = request.params;
  const { workspace } = request.requestContext;
  const id = `${superAppId.slice(0, 8)}:${smId}`;
  const doc = await anyCol(resolveSuperAppDbName(workspace, superAppId), 'team_rbac_matrix').findOne({ _id: id });
  if (!doc) return reply.code(404).send({ error: 'Team RBAC matrix not found for SM' });
  return reply.send(doc);
}

/**
 * PUT /superapp/:superAppId/team-rbac-matrix/:smId
 * Full permissions replacement — replaces the permissions array entirely.
 */
async function updateMatrixBySm(
  request: FastifyRequest<{ Params: { superAppId: string; smId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId, smId } = request.params;
  const { workspace } = request.requestContext;
  const body = UpdateTeamRbacMatrixSchema.parse(request.body);
  const id = `${superAppId.slice(0, 8)}:${smId}`;

  const result = await anyCol(resolveSuperAppDbName(workspace, superAppId), 'team_rbac_matrix').findOneAndUpdate(
    { _id: id },
    { $set: { permissions: body.permissions } },
    { returnDocument: 'after' },
  );

  if (!result) return reply.code(404).send({ error: 'Team RBAC matrix not found for SM' });
  return reply.send(result);
}

export async function teamRbacHandlers(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { superAppId: string } }>('/superapp/:superAppId/team-rbac-matrix', getMatrix);
  app.get<{ Params: { superAppId: string; smId: string } }>('/superapp/:superAppId/team-rbac-matrix/:smId', getMatrixBySm);
  app.put<{ Params: { superAppId: string; smId: string } }>(
    '/superapp/:superAppId/team-rbac-matrix/:smId',
    { preHandler: [requireWorkspaceAdmin] },
    updateMatrixBySm,
  );
}

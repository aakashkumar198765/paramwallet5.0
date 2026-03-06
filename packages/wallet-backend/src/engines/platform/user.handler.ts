import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { anyCol } from '../../db/mongo.js';
import {
  resolveSuperAppDbName,
  resolveWorkspaceDb,
  resolveSaasDb,
  resolveDefinitionsDb,
} from '../../db/resolver.js';
import { AddUsersSchema, UpdateUserSchema } from './schemas.js';
import { requireWorkspaceAdmin } from '../../middleware/rbac.js';

function sappCol(workspace: string, superAppId: string, colName: string) {
  return anyCol(resolveSuperAppDbName(workspace, superAppId), colName);
}

async function validatePlantsAndTeams(
  workspaceDb: string,
  superAppId: string,
  role: string,
  plantTeams: Array<{ plant: string; teams: string[] }>,
): Promise<string | null> {
  for (const pt of plantTeams) {
    const plant = await anyCol(workspaceDb, 'plants').findOne({ _id: `plant:${pt.plant}` });
    if (!plant || !plant['isActive']) return `Plant '${pt.plant}' not found or inactive`;
  }
  const superAppDef = await anyCol(resolveDefinitionsDb(), 'superapp_definitions').findOne({ _id: superAppId });
  if (superAppDef) {
    const roleDef = (superAppDef['roles'] as Array<{ name: string; teams: Array<{ name: string }> }>)?.find((r) => r.name === role);
    if (roleDef) {
      const validTeams = new Set(roleDef.teams.map((t) => t.name));
      for (const pt of plantTeams) {
        for (const team of pt.teams) {
          if (!validTeams.has(team)) return `Team '${team}' not defined for role '${role}'`;
        }
      }
    }
  }
  return null;
}

async function listUsersByRole(
  request: FastifyRequest<{ Params: { superAppId: string; role: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId, role } = request.params;
  const { workspace } = request.requestContext;
  return reply.send({ users: await sappCol(workspace, superAppId, 'app_users').find({ superAppId, role }).toArray() });
}

async function addUsers(
  request: FastifyRequest<{ Params: { superAppId: string; role: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId, role } = request.params;
  const { workspace } = request.requestContext;
  const { userId: addedBy } = request.authContext;
  const body = AddUsersSchema.parse(request.body);
  const now = Date.now();
  const added: unknown[] = [];
  const errors: string[] = [];

  for (const userEntry of body.users) {
    const err = await validatePlantsAndTeams(resolveWorkspaceDb(workspace), superAppId, role, userEntry.plantTeams);
    if (err) { errors.push(`${userEntry.email}: ${err}`); continue; }

    const userUserId = createHash('sha256').update(userEntry.email.toLowerCase()).digest('hex');
    const appUserId = userEntry.partnerId
      ? `user:${superAppId}:${userUserId}:${userEntry.partnerId}`
      : `user:${superAppId}:${userUserId}`;

    const doc = { _id: appUserId, superAppId, userId: userUserId, email: userEntry.email, orgParamId: userEntry.orgParamId, role, partnerId: userEntry.partnerId ?? null, plantTeams: userEntry.plantTeams, isOrgAdmin: userEntry.isOrgAdmin, status: 'active', addedAt: now, addedBy, updatedAt: now };
    await sappCol(workspace, superAppId, 'app_users').insertOne(doc);
    added.push(doc);

    await anyCol(resolveSaasDb(), 'subdomain_users').updateOne(
      { userId: userUserId },
      { $set: { email: userEntry.email, paramId: userEntry.orgParamId, updatedAt: now }, $addToSet: { subdomains: workspace }, $setOnInsert: { _id: `user:${userUserId}`, name: userEntry.name, subdomains: [], createdAt: now } },
      { upsert: true },
    );
  }
  return reply.code(errors.length === 0 ? 201 : 207).send({ added, errors: errors.length > 0 ? errors : undefined });
}

async function getUser(
  request: FastifyRequest<{ Params: { superAppId: string; userId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId, userId: targetUserId } = request.params;
  const { workspace } = request.requestContext;
  const userDocs = await sappCol(workspace, superAppId, 'app_users').find({ userId: targetUserId, superAppId }).toArray();
  if (!userDocs.length) return reply.code(404).send({ error: 'User not found in SuperApp' });
  return reply.send({ users: userDocs });
}

async function updateUser(
  request: FastifyRequest<{ Params: { superAppId: string; userId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId, userId: targetUserId } = request.params;
  const { workspace } = request.requestContext;
  const body = UpdateUserSchema.parse(request.body);
  const updateSet: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.plantTeams !== undefined) updateSet['plantTeams'] = body.plantTeams;
  if (body.isOrgAdmin !== undefined) updateSet['isOrgAdmin'] = body.isOrgAdmin;

  const result = await sappCol(workspace, superAppId, 'app_users').findOneAndUpdate(
    { userId: targetUserId, superAppId },
    { $set: updateSet },
    { returnDocument: 'after' },
  );
  if (!result) return reply.code(404).send({ error: 'User not found in SuperApp' });

  if (body.name) {
    await anyCol(resolveSaasDb(), 'subdomain_users').updateOne(
      { userId: targetUserId },
      { $set: { name: body.name, updatedAt: Date.now() } },
    );
  }
  return reply.send(result);
}

async function deleteUser(
  request: FastifyRequest<{ Params: { superAppId: string; userId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId, userId: targetUserId } = request.params;
  const { workspace } = request.requestContext;
  const result = await sappCol(workspace, superAppId, 'app_users').updateMany(
    { userId: targetUserId, superAppId },
    { $set: { status: 'suspended', updatedAt: Date.now() } },
  );
  if (result.matchedCount === 0) return reply.code(404).send({ error: 'User not found in SuperApp' });
  return reply.send({ status: 'suspended', modifiedCount: result.modifiedCount });
}

export async function userHandlers(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { superAppId: string; role: string } }>('/superapp/:superAppId/roles/:role/users', listUsersByRole);
  app.post<{ Params: { superAppId: string; role: string } }>('/superapp/:superAppId/roles/:role/users', { preHandler: [requireWorkspaceAdmin] }, addUsers);
  app.get<{ Params: { superAppId: string; userId: string } }>('/superapp/:superAppId/users/:userId', getUser);
  app.put<{ Params: { superAppId: string; userId: string } }>('/superapp/:superAppId/users/:userId', { preHandler: [requireWorkspaceAdmin] }, updateUser);
  app.delete<{ Params: { superAppId: string; userId: string } }>('/superapp/:superAppId/users/:userId', { preHandler: [requireWorkspaceAdmin] }, deleteUser);
}

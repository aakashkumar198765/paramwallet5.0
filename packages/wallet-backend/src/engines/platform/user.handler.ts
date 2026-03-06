import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { Document } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { resolveSuperAppDbName, resolveWorkspaceDb, resolveDomainDb } from '../../db/resolver.js';
import { CreateUsersSchema, UpdateUserSchema } from './schemas.js';
import type { RequestContext } from '../../middleware/request-context.js';

interface UserParams { superAppId: string }
interface UserRoleParams extends UserParams { role: string }
interface UserIdParams extends UserParams { userId: string }

/**
 * GET /superapp/:superAppId/roles/:role/users
 * Spec §15.6: Returns array of app_users.
 */
export async function listUsersByRole(
  request: FastifyRequest<{ Params: UserRoleParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: UserRoleParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId, role } = request.params;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));
  const users = await sappDb
    .collection('app_users')
    .find({ superAppId, role })
    .toArray();

  // Spec response: array (no wrapper)
  return reply.send(users);
}

/**
 * POST /superapp/:superAppId/roles/:role/users
 * Spec §15.6: Batch insert app_users. Backend computes userId = SHA256(email).
 */
export async function createUsers(
  request: FastifyRequest<{ Params: UserRoleParams }>,
  reply: FastifyReply
): Promise<void> {
  const body = CreateUsersSchema.parse(request.body);
  const req = request as FastifyRequest<{ Params: UserRoleParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId, role } = request.params;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));
  const wsDb = getDb(resolveWorkspaceDb(workspace));
  const saasDb = getDb(resolveDomainDb());
  const now = Date.now();

  // Validate all plants exist
  const allPlantCodes = [
    ...new Set(body.users.flatMap(u => u.plantTeams.map(pt => pt.plant))),
  ];

  if (allPlantCodes.length > 0) {
    const existingPlants = await wsDb
      .collection('plants')
      .find({ _id: { $in: allPlantCodes as unknown[] }, isActive: { $ne: false } })
      .toArray();

    const existingCodes = new Set(existingPlants.map(p => (p as Record<string, unknown>)._id as string));
    const missingPlants = allPlantCodes.filter(c => !existingCodes.has(c));

    if (missingPlants.length > 0) {
      return reply.status(400).send({ error: 'Invalid plants', missingPlants });
    }
  }

  // Create app_users docs — backend computes userId = SHA256(email)
  const created: Document[] = [];
  for (const user of body.users) {
    const userId = createHash('sha256').update(user.email.toLowerCase()).digest('hex');
    // Sponsor _id: "user:{superAppId}:{userId}" (no partnerId)
    const docId = `user:${superAppId}:${userId}`;

    const doc = {
      _id: docId,
      userId,
      email: user.email,
      name: user.name ?? null,
      superAppId,
      role,
      plantTeams: user.plantTeams,
      isOrgAdmin: user.isOrgAdmin,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await sappDb.collection('app_users').updateOne(
      { _id: docId as unknown as string },
      { $setOnInsert: doc as unknown as Document },
      { upsert: true }
    );

    // Append workspace to subdomain_users
    await saasDb.collection('subdomain_users').updateOne(
      { userId },
      {
        $setOnInsert: { userId, email: user.email, createdAt: now } as unknown as Document,
        $addToSet: { subdomains: workspace } as unknown as Document,
        $set: { updatedAt: now },
      },
      { upsert: true }
    );

    created.push(doc as unknown as Document);
  }

  // Spec response: array of created app_users (no wrapper)
  return reply.status(201).send(created);
}

/**
 * GET /superapp/:superAppId/users/:userId
 * Spec §15.6: Single app_users document (sponsor) or array (vendor).
 */
export async function getUser(
  request: FastifyRequest<{ Params: UserIdParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: UserIdParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId, userId } = request.params;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));

  const docs = await sappDb
    .collection('app_users')
    .find({ userId, superAppId })
    .toArray();

  if (docs.length === 0) return reply.status(404).send({ error: 'User not found' });
  // Sponsor has one doc, vendor may have multiple
  return reply.send(docs.length === 1 ? docs[0] : docs);
}

/**
 * PUT /superapp/:superAppId/users/:userId
 * Spec §15.6: Updates plantTeams, status, isOrgAdmin.
 */
export async function updateUser(
  request: FastifyRequest<{ Params: UserIdParams }>,
  reply: FastifyReply
): Promise<void> {
  const body = UpdateUserSchema.parse(request.body);
  const req = request as FastifyRequest<{ Params: UserIdParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId, userId } = request.params;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));

  const update: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.plantTeams) update.plantTeams = body.plantTeams;
  if (body.status) update.status = body.status;
  if (body.isOrgAdmin !== undefined) update.isOrgAdmin = body.isOrgAdmin;

  const result = await sappDb.collection('app_users').findOneAndUpdate(
    { userId, superAppId },
    { $set: update },
    { returnDocument: 'after' }
  );

  if (!result) return reply.status(404).send({ error: 'User not found' });
  // Spec response: updated app_users document (no wrapper)
  return reply.send(result);
}

/**
 * DELETE /superapp/:superAppId/users/:userId → soft delete (status: suspended)
 * Spec §15.6: { "userId": "...", "status": "suspended" }
 */
export async function deleteUser(
  request: FastifyRequest<{ Params: UserIdParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: UserIdParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId, userId } = request.params;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));

  const result = await sappDb.collection('app_users').updateMany(
    { userId, superAppId },
    { $set: { status: 'suspended', updatedAt: Date.now() } }
  );

  if (result.matchedCount === 0) return reply.status(404).send({ error: 'User not found' });
  // Spec response: { "userId": "...", "status": "suspended" }
  return reply.send({ userId, status: 'suspended' });
}

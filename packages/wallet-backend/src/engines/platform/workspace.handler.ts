import { FastifyRequest, FastifyReply } from 'fastify';
import { Document } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { resolveDomainDb, resolveWorkspaceDb } from '../../db/resolver.js';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  CreatePlantSchema,
  UpdatePlantSchema,
} from './schemas.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';

// ── Workspace CRUD ────────────────────────────────────────────────────────────

export async function createWorkspace(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = CreateWorkspaceSchema.parse(request.body);
  const req = request as FastifyRequest & { authContext: AuthContext };
  const saasDb = getDb(resolveDomainDb());
  const now = Date.now();

  const workspaceDoc = {
    _id: body.subdomain,
    subdomain: body.subdomain,
    workspaceName: body.workspaceName,
    ownerParamId: req.authContext.paramId,
    ownerOrgName: body.ownerOrgName ?? '',
    createdAt: now,
    updatedAt: now,
    status: 'active',
  };

  // MED-4 fix: Insert into param_saas.subdomains — catch duplicate key to return 409
  try {
    await saasDb.collection('subdomains').insertOne(workspaceDoc as unknown as Document);
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      return reply.status(409).send({ error: 'Workspace with this subdomain already exists' });
    }
    throw err;
  }

  // Register this workspace in the user's subdomain_users record
  const wsOwnerDocId = `user:${req.authContext.userId}`;
  await saasDb.collection('subdomain_users').updateOne(
    { _id: wsOwnerDocId as unknown as string },
    {
      $setOnInsert: {
        _id: wsOwnerDocId,
        userId: req.authContext.userId,
        email: req.authContext.email,
        createdAt: now,
      } as Record<string, unknown>,
      $addToSet: { subdomains: body.subdomain } as Record<string, unknown>,
      $set: { updatedAt: now },
    },
    { upsert: true }
  );

  // Initialise workspace DB by creating a sentinel document
  const wsDb = getDb(resolveWorkspaceDb(body.subdomain));
  await wsDb.collection('_meta').updateOne(
    { _id: 'workspace' as unknown as string },
    { $setOnInsert: { subdomain: body.subdomain, createdAt: now } },
    { upsert: true }
  );

  // Spec response: { subdomain, workspaceName, createdAt (ms) }
  return reply.status(201).send({
    subdomain: body.subdomain,
    workspaceName: body.workspaceName,
    createdAt: now,
  });
}

export async function listWorkspaces(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest & { authContext: AuthContext };
  const saasDb = getDb(resolveDomainDb());

  const userRecord = await saasDb
    .collection('subdomain_users')
    .findOne({ userId: req.authContext.userId });

  if (!userRecord || !Array.isArray((userRecord as Record<string, unknown>).subdomains)) {
    return reply.send([]);
  }

  const subdomains = (userRecord as Record<string, unknown>).subdomains as string[];
  const workspaces = await saasDb
    .collection('subdomains')
    .find({ _id: { $in: subdomains as unknown[] } })
    .project({ _id: 0, subdomain: 1, workspaceName: 1 })
    .toArray();

  // Spec response: [{ subdomain, workspaceName }]
  return reply.send(workspaces);
}

export async function getWorkspace(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest & { requestContext: RequestContext };
  const { workspace } = req.requestContext;

  if (!workspace) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const saasDb = getDb(resolveDomainDb());
  const doc = await saasDb
    .collection('subdomains')
    .findOne({ _id: workspace as unknown as string });

  if (!doc) return reply.status(404).send({ error: 'Workspace not found' });
  // Spec response: full subdomains document (no wrapper)
  return reply.send(doc);
}

export async function updateWorkspace(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = UpdateWorkspaceSchema.parse(request.body);
  const req = request as FastifyRequest & { requestContext: RequestContext };
  const { workspace } = req.requestContext;

  if (!workspace) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const saasDb = getDb(resolveDomainDb());
  const result = await saasDb.collection('subdomains').findOneAndUpdate(
    { _id: workspace as unknown as string },
    { $set: { workspaceName: body.workspaceName, updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );

  if (!result) return reply.status(404).send({ error: 'Workspace not found' });
  // Spec response: updated subdomains document (no wrapper)
  return reply.send(result);
}

// ── Plants ─────────────────────────────────────────────────────────────────────

export async function listPlants(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest & { requestContext: RequestContext };
  const { workspaceDbName } = req.requestContext;

  if (!workspaceDbName) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const wsDb = getDb(workspaceDbName);
  const plants = await wsDb.collection('plants').find({ isActive: { $ne: false } }).toArray();
  // Spec response: [{ code, name, paramId, location, isActive }] (no wrapper)
  return reply.send(plants);
}

export async function createPlant(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = CreatePlantSchema.parse(request.body);
  const req = request as FastifyRequest & { requestContext: RequestContext };
  const { workspaceDbName } = req.requestContext;

  if (!workspaceDbName) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const wsDb = getDb(workspaceDbName);
  const now = Date.now();

  const doc = {
    _id: `plant:${body.code}`,
    code: body.code,
    name: body.name,
    paramId: body.paramId ?? null,
    location: body.location ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await wsDb.collection('plants').insertOne(doc as unknown as Document);

  // Spec response: created plant document (no wrapper)
  return reply.status(201).send(doc);
}

export async function updatePlant(
  request: FastifyRequest<{ Params: { code: string } }>,
  reply: FastifyReply
): Promise<void> {
  const body = UpdatePlantSchema.parse(request.body);
  const req = request as FastifyRequest<{ Params: { code: string } }> & {
    requestContext: RequestContext;
  };
  const { workspaceDbName } = req.requestContext;

  if (!workspaceDbName) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const wsDb = getDb(workspaceDbName);
  const result = await wsDb.collection('plants').findOneAndUpdate(
    { _id: `plant:${request.params.code}` as unknown as string },
    { $set: { ...body, updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );

  if (!result) return reply.status(404).send({ error: 'Plant not found' });
  // Spec response: updated plant document (no wrapper)
  return reply.send(result);
}

export async function deletePlant(
  request: FastifyRequest<{ Params: { code: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: { code: string } }> & {
    requestContext: RequestContext;
  };
  const { workspaceDbName } = req.requestContext;

  if (!workspaceDbName) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const wsDb = getDb(workspaceDbName);
  const result = await wsDb.collection('plants').findOneAndUpdate(
    { _id: `plant:${request.params.code}` as unknown as string },
    { $set: { isActive: false, updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );

  if (!result) return reply.status(404).send({ error: 'Plant not found' });
  // Spec response: { "code": "1810", "isActive": false }
  return reply.send({ code: request.params.code, isActive: false });
}

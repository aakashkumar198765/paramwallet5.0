import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { anyCol } from '../../db/mongo.js';
import { resolveSaasDb } from '../../db/resolver.js';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  CreatePlantSchema,
  UpdatePlantSchema,
} from './schemas.js';
import { requireWorkspaceAdmin } from '../../middleware/rbac.js';

const saas = () => resolveSaasDb();

async function createWorkspace(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = CreateWorkspaceSchema.parse(request.body);
  const { userId, paramId } = request.authContext;
  const now = Date.now();

  const existing = await anyCol(saas(), 'subdomains').findOne({ _id: body.subdomain });
  if (existing) return reply.code(409).send({ error: 'Subdomain already taken' });

  const doc = {
    _id: body.subdomain, subdomain: body.subdomain, workspaceName: body.workspaceName,
    ownerParamId: paramId, ownerOrgName: '', exchangeParamId: body.exchangeParamId,
    status: 'active', createdAt: now, updatedAt: now,
  };
  await anyCol(saas(), 'subdomains').insertOne(doc);
  await anyCol(saas(), 'subdomain_users').updateOne(
    { userId },
    { $addToSet: { subdomains: body.subdomain }, $set: { updatedAt: now } },
    { upsert: true },
  );
  return reply.code(201).send(doc);
}

async function listWorkspaces(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { userId } = request.authContext;
  const userDoc = await anyCol(saas(), 'subdomain_users').findOne({ userId });
  if (!userDoc) return reply.send({ workspaces: [] });
  const subdomains = (userDoc['subdomains'] as string[]) ?? [];
  if (!subdomains.length) return reply.send({ workspaces: [] });
  const workspaces = await anyCol(saas(), 'subdomains').find({ _id: { $in: subdomains } }).toArray();
  return reply.send({ workspaces });
}

async function getWorkspace(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { workspace } = request.requestContext;
  const doc = await anyCol(saas(), 'subdomains').findOne({ _id: workspace });
  if (!doc) return reply.code(404).send({ error: 'Workspace not found' });
  return reply.send(doc);
}

async function updateWorkspace(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = UpdateWorkspaceSchema.parse(request.body);
  const result = await anyCol(saas(), 'subdomains').findOneAndUpdate(
    { _id: request.requestContext.workspace },
    { $set: { workspaceName: body.workspaceName, updatedAt: Date.now() } },
    { returnDocument: 'after' },
  );
  if (!result) return reply.code(404).send({ error: 'Workspace not found' });
  return reply.send(result);
}

// ── Plants ─────────────────────────────────────────────────────────────────────

async function listPlants(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { workspaceDbName } = request.requestContext;
  return reply.send({ plants: await anyCol(workspaceDbName, 'plants').find({}).toArray() });
}

async function createPlant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = CreatePlantSchema.parse(request.body);
  const { workspaceDbName } = request.requestContext;
  const { paramId } = request.authContext;
  const now = Date.now();
  const doc = {
    _id: `plant:${body.code}`, code: body.code, name: body.name,
    paramId, location: body.location ?? {}, isActive: true, createdAt: now,
  };
  await anyCol(workspaceDbName, 'plants').insertOne(doc);
  return reply.code(201).send(doc);
}

async function updatePlant(
  request: FastifyRequest<{ Params: { code: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const body = UpdatePlantSchema.parse(request.body);
  const { workspaceDbName } = request.requestContext;
  const result = await anyCol(workspaceDbName, 'plants').findOneAndUpdate(
    { _id: `plant:${request.params.code}` },
    { $set: body },
    { returnDocument: 'after' },
  );
  if (!result) return reply.code(404).send({ error: 'Plant not found' });
  return reply.send(result);
}

async function deletePlant(
  request: FastifyRequest<{ Params: { code: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { workspaceDbName } = request.requestContext;
  const result = await anyCol(workspaceDbName, 'plants').findOneAndUpdate(
    { _id: `plant:${request.params.code}` },
    { $set: { isActive: false } },
    { returnDocument: 'after' },
  );
  if (!result) return reply.code(404).send({ error: 'Plant not found' });
  return reply.send({ status: 'deactivated', plant: result });
}

/** Routes that need auth only (no X-Workspace header required). */
export async function workspaceAuthHandlers(app: FastifyInstance): Promise<void> {
  app.post('/workspace/create', createWorkspace);
  app.get('/workspace/list', listWorkspaces);
}

/** Routes that need auth + workspace context (X-Workspace header required). */
export async function workspaceHandlers(app: FastifyInstance): Promise<void> {
  app.get('/workspace', getWorkspace);
  app.put('/workspace', { preHandler: [requireWorkspaceAdmin] }, updateWorkspace);
  app.get('/workspace/plants', listPlants);
  app.post('/workspace/plants', { preHandler: [requireWorkspaceAdmin] }, createPlant);
  app.put<{ Params: { code: string } }>('/workspace/plants/:code', { preHandler: [requireWorkspaceAdmin] }, updatePlant);
  app.delete<{ Params: { code: string } }>('/workspace/plants/:code', { preHandler: [requireWorkspaceAdmin] }, deletePlant);
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { anyCol } from '../../db/mongo.js';
import { resolveDefinitionsDb } from '../../db/resolver.js';
import {
  CreateSuperAppDefinitionSchema,
  UpdateSuperAppDefinitionSchema,
  CreateTeamRbacMatrixSchema,
  UpdateTeamRbacMatrixSchema,
} from './schemas.js';

const defsDb = resolveDefinitionsDb;

function col(name: string) { return anyCol(defsDb(), name); }

// ── SuperApp Definitions ──────────────────────────────────────────────────────

async function listSuperAppDefs(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const docs = await col('superapp_definitions').find({}).toArray();
  return reply.send({ superapps: docs });
}

async function getSuperAppDef(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const doc = await col('superapp_definitions').findOne({ _id: request.params.superAppId });
  if (!doc) return reply.code(404).send({ error: 'SuperApp definition not found' });
  return reply.send(doc);
}

async function createSuperAppDef(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = CreateSuperAppDefinitionSchema.parse(request.body);
  const superAppId = randomBytes(10).toString('hex');
  const now = Date.now();
  const doc = { _id: superAppId, ...body, createdBy: request.authContext.userId, createdAt: now, modifiedAt: now };
  await col('superapp_definitions').insertOne(doc);
  return reply.code(201).send(doc);
}

async function updateSuperAppDef(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const body = UpdateSuperAppDefinitionSchema.parse(request.body);
  const result = await col('superapp_definitions').findOneAndUpdate(
    { _id: request.params.superAppId },
    { $set: { ...body, modifiedAt: Date.now() } },
    { returnDocument: 'after' },
  );
  if (!result) return reply.code(404).send({ error: 'SuperApp definition not found' });
  return reply.send(result);
}

// ── SM Definitions ────────────────────────────────────────────────────────────

async function listSmDefs(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
  return reply.send({ sms: await col('onchain_sm_definitions').find({}).toArray() });
}

async function getSmDef(
  request: FastifyRequest<{ Params: { smId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const doc = await col('onchain_sm_definitions').findOne({ _id: request.params.smId });
  if (!doc) return reply.code(404).send({ error: 'SM definition not found' });
  return reply.send(doc);
}

async function getSmStates(
  request: FastifyRequest<{ Params: { smId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const doc = await col('onchain_sm_definitions').findOne({ _id: request.params.smId });
  if (!doc) return reply.code(404).send({ error: 'SM definition not found' });

  const states = (doc['states'] as Record<string, Record<string, unknown>>) ?? {};
  const hierarchy = Object.entries(states).map(([stateName, state]) => ({
    name: stateName,
    phase: state['phase'],
    desc: state['desc'],
    start: state['start'],
    end: state['end'],
    owner: state['owner'],
    visibility: state['visibility'],
    subStates: Object.entries(
      (state['subStates'] as Record<string, Record<string, unknown>>) ?? {},
    ).map(([subName, sub]) => ({
      name: subName,
      start: sub['start'],
      end: sub['end'],
      owner: sub['owner'],
      microStates: Object.keys((sub['microStates'] as Record<string, unknown>) ?? {}),
    })),
  }));
  return reply.send({ smId: request.params.smId, states: hierarchy });
}

// ── Schema Definitions ────────────────────────────────────────────────────────

async function listSchemaDefs(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
  return reply.send({ schemas: await col('onchain_schema_definitions').find({}).toArray() });
}

async function getSchemaDef(
  request: FastifyRequest<{ Params: { schemaId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const doc = await col('onchain_schema_definitions').findOne({ _id: request.params.schemaId });
  if (!doc) return reply.code(404).send({ error: 'Schema definition not found' });
  return reply.send(doc);
}

// ── OffChain SM Definitions ───────────────────────────────────────────────────

async function listOffchainSmDefs(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
  return reply.send({ offchainSms: await col('offchain_sm_definitions').find({}).toArray() });
}

async function getOffchainSmDef(
  request: FastifyRequest<{ Params: { offchainSmId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const doc = await col('offchain_sm_definitions').findOne({ _id: request.params.offchainSmId });
  if (!doc) return reply.code(404).send({ error: 'OffChain SM definition not found' });
  return reply.send(doc);
}

async function getOffchainSchemaDef(
  request: FastifyRequest<{ Params: { schemaId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const doc = await col('offchain_schema_definitions').findOne({ _id: request.params.schemaId });
  if (!doc) return reply.code(404).send({ error: 'OffChain schema definition not found' });
  return reply.send(doc);
}

// ── Team RBAC Matrix (param_definitions) ─────────────────────────────────────

async function getTeamRbacMatrix(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const docs = await col('team_rbac_matrix')
    .find({ superAppId: request.params.superAppId })
    .toArray();
  return reply.send({ matrix: docs });
}

async function getTeamRbacMatrixBySm(
  request: FastifyRequest<{ Params: { superAppId: string; smId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const id = `${request.params.superAppId.slice(0, 8)}:${request.params.smId}`;
  const doc = await col('team_rbac_matrix').findOne({ _id: id });
  if (!doc) return reply.code(404).send({ error: 'Team RBAC matrix not found' });
  return reply.send(doc);
}

async function createTeamRbacMatrix(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = CreateTeamRbacMatrixSchema.parse(request.body);
  const id = `${body.superAppId.slice(0, 8)}:${body.smId}`;
  const now = Date.now();
  const doc = { _id: id, ...body, createdAt: now };
  await col('team_rbac_matrix').insertOne(doc);
  return reply.code(201).send(doc);
}

async function updateTeamRbacMatrix(
  request: FastifyRequest<{ Params: { superAppId: string; smId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const body = UpdateTeamRbacMatrixSchema.parse(request.body);
  const id = `${request.params.superAppId.slice(0, 8)}:${request.params.smId}`;
  const result = await col('team_rbac_matrix').findOneAndUpdate(
    { _id: id },
    { $set: { permissions: body.permissions } },
    { returnDocument: 'after' },
  );
  if (!result) return reply.code(404).send({ error: 'Team RBAC matrix not found' });
  return reply.send(result);
}

export async function definitionsHandlers(app: FastifyInstance): Promise<void> {
  app.get('/definitions/superapps', listSuperAppDefs);
  app.get<{ Params: { superAppId: string } }>('/definitions/superapps/:superAppId', getSuperAppDef);
  app.post('/definitions/superapps', createSuperAppDef);
  app.put<{ Params: { superAppId: string } }>('/definitions/superapps/:superAppId', updateSuperAppDef);

  app.get('/definitions/sm', listSmDefs);
  app.get<{ Params: { smId: string } }>('/definitions/sm/:smId', getSmDef);
  app.get<{ Params: { smId: string } }>('/definitions/sm/:smId/states', getSmStates);

  app.get('/definitions/schemas', listSchemaDefs);
  app.get<{ Params: { schemaId: string } }>('/definitions/schemas/:schemaId', getSchemaDef);

  app.get('/definitions/offchain-sm', listOffchainSmDefs);
  app.get<{ Params: { offchainSmId: string } }>('/definitions/offchain-sm/:offchainSmId', getOffchainSmDef);
  app.get<{ Params: { schemaId: string } }>('/definitions/offchain-schemas/:schemaId', getOffchainSchemaDef);

  app.get<{ Params: { superAppId: string } }>('/definitions/team-rbac-matrix/:superAppId', getTeamRbacMatrix);
  app.get<{ Params: { superAppId: string; smId: string } }>('/definitions/team-rbac-matrix/:superAppId/:smId', getTeamRbacMatrixBySm);
  app.post('/definitions/team-rbac-matrix', createTeamRbacMatrix);
  app.put<{ Params: { superAppId: string; smId: string } }>('/definitions/team-rbac-matrix/:superAppId/:smId', updateTeamRbacMatrix);
}

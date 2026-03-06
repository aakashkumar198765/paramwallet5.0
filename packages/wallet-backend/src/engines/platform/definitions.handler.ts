import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { Document } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { resolveDefinitionsDb } from '../../db/resolver.js';
import {
  CreateSuperAppDefinitionSchema,
  UpdateSuperAppDefinitionSchema,
  CreateTeamRbacMatrixSchema,
  UpdateTeamRbacMatrixSchema,
} from './schemas.js';
import type { AuthContext } from '../../middleware/auth.js';

// ── SuperApp Definitions ──────────────────────────────────────────────────────

/**
 * GET /definitions/superapps
 * Spec §15.3: Array of superapp_definitions docs.
 */
export async function listSuperAppDefinitions(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const docs = await db.collection('superapp_definitions').find({}).toArray();
  // Spec response: array (no wrapper)
  return reply.send(docs);
}

/**
 * GET /definitions/superapps/:id
 * Spec §15.3: Single superapp_definitions doc. 404 if not found.
 */
export async function getSuperAppDefinition(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const doc = await db
    .collection('superapp_definitions')
    .findOne({ _id: request.params.id as unknown as string });

  if (!doc) return reply.status(404).send({ error: 'SuperApp definition not found' });
  // Spec response: single doc (no wrapper)
  return reply.send(doc);
}

/**
 * POST /definitions/superapps
 * Spec §15.3: Creates a superapp_definition. Returns created doc.
 */
export async function createSuperAppDefinition(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = CreateSuperAppDefinitionSchema.parse(request.body);
  const db = getDb(resolveDefinitionsDb());
  const req = request as FastifyRequest & { authContext: AuthContext };

  const superAppId = randomBytes(10).toString('hex');
  const now = Date.now();

  const doc = {
    _id: superAppId,
    ...body,
    createdBy: req.authContext.userId,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('superapp_definitions').insertOne(doc as unknown as Document);
  // Spec response: created doc (no wrapper)
  return reply.status(201).send(doc);
}

/**
 * PUT /definitions/superapps/:id
 * Spec §15.3: Updates a superapp_definition. Returns updated doc.
 */
export async function updateSuperAppDefinition(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const body = UpdateSuperAppDefinitionSchema.parse(request.body);
  const db = getDb(resolveDefinitionsDb());

  const result = await db.collection('superapp_definitions').findOneAndUpdate(
    { _id: request.params.id as unknown as string },
    { $set: { ...body, updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );

  if (!result) return reply.status(404).send({ error: 'SuperApp definition not found' });
  // Spec response: updated doc (no wrapper)
  return reply.send(result);
}

// ── SM Definitions ─────────────────────────────────────────────────────────────

/**
 * GET /definitions/sm
 * Spec §15.3: Array of onchain_sm_definitions.
 */
export async function listSmDefinitions(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const docs = await db.collection('onchain_sm_definitions').find({}).toArray();
  // Spec response: array (no wrapper)
  return reply.send(docs);
}

/**
 * GET /definitions/sm/:smId
 * Spec §15.3: Single SM definition doc. 404 if not found.
 */
export async function getSmDefinition(
  request: FastifyRequest<{ Params: { smId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const doc = await db
    .collection('onchain_sm_definitions')
    .findOne({ _id: request.params.smId as unknown as string });

  if (!doc) return reply.status(404).send({ error: 'SM definition not found' });
  // Spec response: single doc (no wrapper)
  return reply.send(doc);
}

/**
 * GET /definitions/sm/:smId/states
 * Spec §16.2: Returns { smId, states: [...] } — state hierarchy for RBAC filtering.
 */
export async function getSmStates(
  request: FastifyRequest<{ Params: { smId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const { smId } = request.params;
  const doc = await db
    .collection('onchain_sm_definitions')
    .findOne({ _id: smId as unknown as string });

  if (!doc) return reply.status(404).send({ error: 'SM definition not found' });

  // HIGH-6 fix: Spec §16.2 requires states as a navigable array with `name` keys:
  // [{ "name": "Contract", "phase": "Agreement", "subStates": [...] }]
  // The raw doc.states is a keyed object: { "Contract": { desc, phase, subStates, ... } }
  // Convert to array format for spec compliance.
  const rawStates = (doc.states ?? {}) as Record<string, Record<string, unknown>>;
  const statesArray = Object.entries(rawStates).map(([name, def]) => ({
    name,
    ...def,
  }));

  // Spec response: { smId, states: [...] }
  return reply.send({ smId, states: statesArray });
}

// ── Schema Definitions ─────────────────────────────────────────────────────────

/**
 * GET /definitions/schemas
 * Spec §15.3: Array of onchain_schema_definitions.
 */
export async function listSchemaDefinitions(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const docs = await db.collection('onchain_schema_definitions').find({}).toArray();
  // Spec response: array (no wrapper)
  return reply.send(docs);
}

/**
 * GET /definitions/schemas/:schemaId
 * Spec §15.3: Single schema definition. 404 if not found.
 */
export async function getSchemaDefinition(
  request: FastifyRequest<{ Params: { schemaId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const doc = await db
    .collection('onchain_schema_definitions')
    .findOne({ _id: request.params.schemaId as unknown as string });

  if (!doc) return reply.status(404).send({ error: 'Schema definition not found' });
  // Spec response: single doc (no wrapper)
  return reply.send(doc);
}

// ── Offchain Definitions ───────────────────────────────────────────────────────

/**
 * GET /definitions/offchain-sm
 * Spec §15.3: Array of offchain_sm_definitions.
 */
export async function listOffchainSmDefinitions(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const docs = await db.collection('offchain_sm_definitions').find({}).toArray();
  // Spec response: array (no wrapper)
  return reply.send(docs);
}

/**
 * GET /definitions/offchain-sm/:id
 * Spec §15.3: Single offchain SM definition. 404 if not found.
 */
export async function getOffchainSmDefinition(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const doc = await db
    .collection('offchain_sm_definitions')
    .findOne({ _id: request.params.id as unknown as string });

  if (!doc) return reply.status(404).send({ error: 'Offchain SM definition not found' });
  // Spec response: single doc (no wrapper)
  return reply.send(doc);
}

/**
 * GET /definitions/offchain-schemas/:id
 * Spec §15.3: Single offchain schema definition. 404 if not found.
 */
export async function getOffchainSchemaDefinition(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const doc = await db
    .collection('offchain_schema_definitions')
    .findOne({ _id: request.params.id as unknown as string });

  if (!doc) return reply.status(404).send({ error: 'Offchain schema definition not found' });
  // Spec response: single doc (no wrapper)
  return reply.send(doc);
}

// ── Team RBAC Matrix (Definitions layer) ─────────────────────────────────────

/**
 * GET /definitions/team-rbac-matrix/:superAppId
 * Spec §15.3: Array of team_rbac_matrix docs for this superApp.
 */
export async function listDefinitionTeamRbacMatrix(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const docs = await db
    .collection('team_rbac_matrix')
    .find({ superAppId: request.params.superAppId })
    .toArray();
  // Spec response: array (no wrapper)
  return reply.send(docs);
}

/**
 * GET /definitions/team-rbac-matrix/:superAppId/:smId
 * Spec §15.3: Single team_rbac_matrix doc. 404 if not found.
 */
export async function getDefinitionTeamRbacMatrix(
  request: FastifyRequest<{ Params: { superAppId: string; smId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const db = getDb(resolveDefinitionsDb());
  const { superAppId, smId } = request.params;
  const id = `${superAppId.slice(0, 8)}:${smId}`;
  const doc = await db
    .collection('team_rbac_matrix')
    .findOne({ _id: id as unknown as string });

  if (!doc) return reply.status(404).send({ error: 'Team RBAC matrix not found' });
  // Spec response: single doc (no wrapper)
  return reply.send(doc);
}

/**
 * POST /definitions/team-rbac-matrix
 * Spec §15.3: Creates a team_rbac_matrix definition. Returns created doc.
 */
export async function createDefinitionTeamRbacMatrix(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = CreateTeamRbacMatrixSchema.parse(request.body);
  const db = getDb(resolveDefinitionsDb());

  // Look up smName from onchain_sm_definitions if not provided in body
  let smName = body.smName;
  if (!smName) {
    const smDef = await db
      .collection('onchain_sm_definitions')
      .findOne({ _id: body.smId as unknown as string });
    smName = (smDef as Record<string, unknown> | null)?.name as string | undefined;
  }

  const id = `${body.superAppId.slice(0, 8)}:${body.smId}`;
  const now = Date.now();

  const doc = {
    _id: id,
    ...body,
    smName: smName ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('team_rbac_matrix').insertOne(doc as unknown as Document);
  // Spec response: created doc (no wrapper)
  return reply.status(201).send(doc);
}

/**
 * PUT /definitions/team-rbac-matrix/:superAppId/:smId
 * Spec §15.3: Updates permissions on a team_rbac_matrix definition.
 */
export async function updateDefinitionTeamRbacMatrix(
  request: FastifyRequest<{ Params: { superAppId: string; smId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const body = UpdateTeamRbacMatrixSchema.parse(request.body);
  const db = getDb(resolveDefinitionsDb());
  const { superAppId, smId } = request.params;
  const id = `${superAppId.slice(0, 8)}:${smId}`;

  const result = await db.collection('team_rbac_matrix').findOneAndUpdate(
    { _id: id as unknown as string },
    { $set: { permissions: body.permissions, updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );

  if (!result) return reply.status(404).send({ error: 'Team RBAC matrix not found' });
  // Spec response: updated doc (no wrapper)
  return reply.send(result);
}

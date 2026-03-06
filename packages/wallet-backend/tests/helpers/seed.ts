import { createHash, randomBytes } from 'crypto';
import type { MongoClient } from 'mongodb';
import {
  resolveSaasDb,
  resolveWorkspaceDb,
  resolveSuperAppDbName,
  resolveDefinitionsDb,
  resolveAuthDb,
} from '../../src/db/resolver.js';

export function makeUserId(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex');
}

export async function seedWorkspace(
  client: MongoClient,
  subdomain: string,
  ownerParamId = '0x6193b497f8e2a1d340b20000',
): Promise<void> {
  const now = Date.now();
  await client.db(resolveSaasDb()).collection('subdomains').insertOne({
    _id: subdomain,
    subdomain,
    workspaceName: `${subdomain} Workspace`,
    ownerParamId,
    ownerOrgName: 'Test Org',
    exchangeParamId: '0x5e282dE100000000000000000000000000000000',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
}

export async function seedSuperApp(
  client: MongoClient,
  workspace: string,
  superAppId: string,
  ownerParamId = '0x6193b497f8e2a1d340b20000',
): Promise<void> {
  const now = Date.now();
  // installed_superapps
  await client.db(resolveWorkspaceDb(workspace)).collection('installed_superapps').insertOne({
    _id: superAppId,
    name: 'Test SuperApp',
    desc: '',
    version: '1.0.0',
    roles: [
      { name: 'Sponsor', desc: '', teams: [{ name: 'Admin', desc: '' }] },
      { name: 'Partner', desc: '', teams: [{ name: 'Partner', desc: '' }] },
    ],
    linkedSMs: [],
    sponsor: 'Sponsor',
    paramId: ownerParamId,
    status: 'active',
    installedAt: now,
    installedBy: makeUserId('admin@test.com'),
  });

  // sponsor org in sapp DB
  const sappDb = client.db(resolveSuperAppDbName(workspace, superAppId));
  const orgParamIdSlice = ownerParamId.startsWith('0x')
    ? ownerParamId.slice(2, 22)
    : ownerParamId.slice(0, 20);
  await sappDb.collection('organizations').insertOne({
    _id: `org:${superAppId}:Sponsor:${orgParamIdSlice}`,
    superAppId,
    role: 'Sponsor',
    isSponsorOrg: true,
    org: { paramId: ownerParamId, name: 'Test Sponsor Org' },
    orgAdmin: null,
    status: 'active',
    onboardedAt: now,
    updatedAt: now,
  });
}

export async function seedOrg(
  client: MongoClient,
  workspace: string,
  superAppId: string,
  role: string,
  paramId: string,
  partnerId?: string,
): Promise<void> {
  const now = Date.now();
  const paramIdSlice = paramId.startsWith('0x') ? paramId.slice(2, 22) : paramId.slice(0, 20);
  const orgId = partnerId
    ? `org:${superAppId}:${role}:${paramIdSlice}:${partnerId}`
    : `org:${superAppId}:${role}:${paramIdSlice}`;

  await client.db(resolveSuperAppDbName(workspace, superAppId)).collection('organizations').insertOne({
    _id: orgId,
    superAppId,
    role,
    isSponsorOrg: !partnerId,
    org: { paramId, name: `${role} Org`, ...(partnerId ? { partnerId } : {}) },
    status: 'active',
    onboardedAt: now,
    updatedAt: now,
  });
}

export async function seedUser(
  client: MongoClient,
  workspace: string,
  superAppId: string,
  email: string,
  role: string,
  orgParamId: string,
  plantTeams: Array<{ plant: string; teams: string[] }>,
  partnerId?: string,
): Promise<string> {
  const userId = makeUserId(email);
  const appUserId = partnerId
    ? `user:${superAppId}:${userId}:${partnerId}`
    : `user:${superAppId}:${userId}`;
  const now = Date.now();

  await client.db(resolveSuperAppDbName(workspace, superAppId)).collection('app_users').insertOne({
    _id: appUserId,
    superAppId,
    userId,
    email,
    orgParamId,
    role,
    partnerId: partnerId ?? null,
    plantTeams,
    isOrgAdmin: false,
    status: 'active',
    addedAt: now,
    addedBy: 'system',
    updatedAt: now,
  });

  // global subdomain_users
  await client.db(resolveSaasDb()).collection('subdomain_users').updateOne(
    { userId },
    {
      $set: { email, userId, paramId: orgParamId, updatedAt: now },
      $addToSet: { subdomains: workspace },
      $setOnInsert: { _id: `user:${userId}`, name: '', subdomains: [], createdAt: now },
    },
    { upsert: true },
  );

  return userId;
}

export async function seedRbacMatrix(
  client: MongoClient,
  workspace: string,
  superAppId: string,
  smId: string,
  permissions: Array<{
    state: string;
    subState: string | null;
    microState: string | null;
    access: Record<string, 'RW' | 'RO' | 'N/A'>;
  }>,
): Promise<void> {
  const id = `${superAppId.slice(0, 8)}:${smId}`;
  await client.db(resolveSuperAppDbName(workspace, superAppId)).collection('team_rbac_matrix').insertOne({
    _id: id,
    superAppId,
    smId,
    smName: 'Test SM',
    permissions,
    createdAt: Date.now(),
    version: '1.0.0',
  });
}

export async function seedSmDocument(
  client: MongoClient,
  workspace: string,
  superAppId: string,
  orgParamId: string,
  portal: string,
  state: string,
  subState: string | null,
  smId = 'test:0xabc123',
  plants: string[] = ['plant1'],
): Promise<string> {
  const { resolveOrgPartitionDbName } = await import('../../src/db/resolver.js');
  const orgPartDbName = resolveOrgPartitionDbName(workspace, superAppId, orgParamId, portal);
  const docId = randomBytes(16).toString('hex');
  const colName = `sm_${state}_${smId.replace('test:', '').slice(0, 6)}`;
  const now = Date.now();

  await client.db(orgPartDbName).collection(colName).insertOne({
    _id: docId,
    _local: { state, subState: subState ?? null, microState: null, phase: 'Agreement', timestamp: now, smId },
    _chain: {
      roles: { [portal]: orgParamId },
      _sys: { plantIDs: { [orgParamId]: plants }, restrictedTo: [] },
    },
  });

  return docId;
}

export async function seedSession(
  client: MongoClient,
  paramId: string,
  userId: string,
  email: string,
  tokenHash: string,
  refreshToken: string,
): Promise<void> {
  const now = Date.now();
  await client.db(resolveAuthDb()).collection(paramId).insertOne({
    _id: `session:${tokenHash}`,
    userId,
    email,
    paramId,
    token: tokenHash,
    refreshToken,
    createdAt: now,
    expiresAt: now + 3600 * 1000,
    refreshExpiresAt: now + 604800 * 1000,
  });
}

export async function seedSuperAppDefinition(
  client: MongoClient,
  superAppId: string,
  roles: Array<{ name: string; teams: Array<{ name: string }> }>,
  sponsor: string,
  linkedSMs: string[] = [],
): Promise<void> {
  const now = Date.now();
  await client.db(resolveDefinitionsDb()).collection('superapp_definitions').insertOne({
    _id: superAppId,
    name: 'Test SuperApp Def',
    desc: '',
    version: '1.0.0',
    roles: roles.map((r) => ({ ...r, desc: '' })),
    linkedSMs,
    sponsor,
    isActive: 1,
    createdBy: 'system',
    createdAt: now,
    modifiedAt: now,
  });
}

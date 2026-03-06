import { MongoClient, Document } from 'mongodb';
import { createHash } from 'crypto';
import {
  resolveWorkspaceDb,
  resolveSuperAppDbName,
  resolveOrgPartitionDbName,
  resolveDomainDb,
  resolveDefinitionsDb,
} from '../../src/db/resolver.js';

export async function seedWorkspace(
  client: MongoClient,
  subdomain: string
): Promise<void> {
  const saasDb = client.db(resolveDomainDb());
  const now = new Date();

  await saasDb.collection('subdomains').updateOne(
    { _id: subdomain },
    {
      $set: {
        _id: subdomain,
        subdomain,
        workspaceName: `${subdomain} Workspace`,
        orgName: 'Test Org',
        paramId: '0xTESTPARAMID',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  // Init workspace DB
  const wsDb = client.db(resolveWorkspaceDb(subdomain));
  await wsDb.collection('_meta').updateOne(
    { _id: 'workspace' },
    { $setOnInsert: { subdomain, createdAt: now } },
    { upsert: true }
  );
}

export async function seedSuperApp(
  client: MongoClient,
  workspace: string,
  superAppId: string
): Promise<void> {
  const wsDb = client.db(resolveWorkspaceDb(workspace));
  const defsDb = client.db(resolveDefinitionsDb());
  const now = new Date();

  // Insert into installed_superapps
  await wsDb.collection('installed_superapps').updateOne(
    { _id: superAppId },
    {
      $set: {
        _id: superAppId,
        superAppId,
        name: `TestApp-${superAppId.slice(0, 4)}`,
        linkedSMs: [],
        status: 'active',
        installedAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  // Insert into param_definitions.superapp_definitions
  await defsDb.collection('superapp_definitions').updateOne(
    { _id: superAppId },
    {
      $set: {
        _id: superAppId,
        superAppId,
        name: `TestApp-${superAppId.slice(0, 4)}`,
        linkedSMs: [],
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
}

export async function seedOrg(
  client: MongoClient,
  workspace: string,
  superAppId: string,
  role: string,
  paramId: string
): Promise<void> {
  const sappDb = client.db(resolveSuperAppDbName(workspace, superAppId));
  const orgPart = paramId.startsWith('0x') ? paramId.slice(2, 22) : paramId.slice(0, 20);
  const orgId = `org:${superAppId}:${role}:${orgPart}`;
  const now = new Date();

  await sappDb.collection('organizations').updateOne(
    { _id: orgId },
    {
      $set: {
        _id: orgId,
        superAppId,
        role,
        org: { paramId, name: `${role} Org` },
        status: 'active',
        isSponsor: role === 'Sponsor',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
}

export async function seedUser(
  client: MongoClient,
  workspace: string,
  superAppId: string,
  userId: string,
  role: string,
  plantTeams: Array<{ plant: string; teams: string[] }>
): Promise<void> {
  const sappDb = client.db(resolveSuperAppDbName(workspace, superAppId));
  const saasDb = client.db(resolveDomainDb());
  const email = `${userId}@test.com`;
  const now = new Date();

  // app_users
  const appUserId = `au:${superAppId}:${role}:${userId}`;
  await sappDb.collection('app_users').updateOne(
    { _id: appUserId },
    {
      $set: {
        _id: appUserId,
        userId,
        email,
        superAppId,
        role,
        plantTeams,
        isOrgAdmin: false,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  // subdomain_users
  await saasDb.collection('subdomain_users').updateOne(
    { userId },
    {
      $setOnInsert: { userId, email, createdAt: now },
      $addToSet: { subdomains: workspace },
      $set: { updatedAt: now },
    },
    { upsert: true }
  );
}

export async function seedSmDocument(
  client: MongoClient,
  workspace: string,
  superAppId: string,
  orgParamId: string,
  portal: string,
  state: string,
  subState: string
): Promise<string> {
  const orgDbName = resolveOrgPartitionDbName(workspace, superAppId, orgParamId, portal);
  const orgDb = client.db(orgDbName);
  const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const now = new Date();

  const doc = {
    _id: docId,
    _local: {
      state,
      subState,
      timestamp: now,
      phase: 'active',
    },
    _chain: {
      superAppId,
      smId: `sm_${state}`,
      orgParamId,
      roles: [{ paramId: orgParamId, role: portal }],
    },
  };

  const collectionName = `sm_${state}_${subState}`;
  await orgDb.collection(collectionName).insertOne(doc as unknown as Document);

  return docId;
}

export async function seedRbacMatrix(
  client: MongoClient,
  workspace: string,
  superAppId: string,
  smId: string,
  permissions: Array<{
    role: string;
    team: string;
    state: string;
    subState?: string;
    access: 'RW' | 'RO' | 'N/A';
  }>
): Promise<void> {
  const sappDb = client.db(resolveSuperAppDbName(workspace, superAppId));
  const rbacId = `${superAppId.slice(0, 8)}:${smId}`;
  const now = new Date();

  await sappDb.collection('team_rbac_matrix').updateOne(
    { _id: rbacId },
    {
      $set: {
        _id: rbacId,
        superAppId,
        smId,
        permissions,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
}

/**
 * Create a SHA256 userId from an email (mirrors server logic).
 */
export function makeUserId(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex');
}

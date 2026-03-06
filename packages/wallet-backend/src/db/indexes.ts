import { getDb } from './mongo.js';
import { resolveAuthDb, resolveDomainDb } from './resolver.js';
import { logger } from '../logger.js';

// SM collection indexes — applied when dynamic SM collections are created
export const SM_INDEXES = [
  { '_local.state': 1, '_local.subState': 1, '_local.timestamp': -1 },
  { '_local.timestamp': -1 },
  { '_local.phase': 1, '_local.timestamp': -1 },
] as const;

export async function createCoreIndexes(): Promise<void> {
  try {
    const saasDb = getDb(resolveDomainDb());

    // param_saas.subdomain_users
    const subdomainUsersCol = saasDb.collection('subdomain_users');
    await subdomainUsersCol.createIndex({ userId: 1 }, { unique: true, background: true });
    await subdomainUsersCol.createIndex({ email: 1 }, { background: true });

    // param_saas.subdomains
    const subdomainsCol = saasDb.collection('subdomains');
    await subdomainsCol.createIndex({ subdomain: 1 }, { unique: true, background: true });

    // param_auth — sessions are stored per-paramId collection
    // We create a placeholder index on a known collection; dynamic collections get indexed on first use
    // auth session refresh token index applied dynamically (see ensureAuthSessionIndexes)

    logger.info('Core MongoDB indexes created');
  } catch (err) {
    logger.error({ err }, 'Failed to create core indexes');
    throw err;
  }
}

/**
 * Called whenever a new param_auth.{paramId} collection is first written to.
 * Idempotent — MongoDB ignores duplicate index creation.
 */
export async function ensureAuthSessionIndexes(paramId: string): Promise<void> {
  const authDb = getDb(resolveAuthDb());
  const col = authDb.collection(paramId);
  await col.createIndex({ refreshToken: 1 }, { background: true });
  await col.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true }  // TTL index
  );
}

/**
 * Called when txn_history collection is first used in a given DB.
 */
export async function ensureTxnHistoryIndexes(dbName: string): Promise<void> {
  const db = getDb(dbName);
  const col = db.collection('txn_history');
  await col.createIndex({ docId: 1, sequence: 1 }, { background: true });
  await col.createIndex({ rootTxn: 1 }, { background: true });
  await col.createIndex({ timestamp: -1 }, { background: true });
}

/**
 * Called when app_users collection is first used in a given SuperApp DB.
 */
export async function ensureAppUserIndexes(superAppDbName: string): Promise<void> {
  const db = getDb(superAppDbName);
  const col = db.collection('app_users');
  await col.createIndex({ userId: 1, superAppId: 1 }, { background: true });
  await col.createIndex({ userId: 1, superAppId: 1, partnerId: 1 }, { background: true });
}

/**
 * Apply SM collection indexes to a specific SM collection.
 */
export async function applySmIndexes(dbName: string, collectionName: string): Promise<void> {
  const db = getDb(dbName);
  const col = db.collection(collectionName);
  for (const indexSpec of SM_INDEXES) {
    await col.createIndex(indexSpec as Record<string, number>, { background: true });
  }
}

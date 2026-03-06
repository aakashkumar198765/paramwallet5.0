import type { MongoClient } from 'mongodb';
import { resolveSaasDb } from './resolver.js';
import { logger } from '../logger.js';

/**
 * Creates all critical indexes on startup.
 * All createIndex calls are idempotent — safe to re-run on every startup.
 */
export async function createIndexes(client: MongoClient): Promise<void> {
  const saasDb = client.db(resolveSaasDb());

  try {
    // param_saas.subdomain_users indexes (hot path — login + profile lookup)
    const subdomainUsersCol = saasDb.collection('subdomain_users');
    await Promise.all([
      subdomainUsersCol.createIndex({ userId: 1 }, { unique: true, background: true }),
      subdomainUsersCol.createIndex({ email: 1 }, { background: true }),
    ]);
    logger.info('param_saas indexes created');
  } catch (err) {
    logger.warn({ err }, 'Index creation warning (may already exist)');
  }
}

/**
 * Creates app_users indexes for a newly installed SuperApp DB.
 * Called as a side effect of POST /superapp/install.
 */
export async function createSuperAppIndexes(client: MongoClient, dbName: string): Promise<void> {
  try {
    const db = client.db(dbName);
    const appUsersCol = db.collection('app_users');
    await Promise.all([
      appUsersCol.createIndex(
        { userId: 1, superAppId: 1 },
        { background: true },
      ),
      appUsersCol.createIndex(
        { userId: 1, superAppId: 1, partnerId: 1 },
        { background: true },
      ),
    ]);
    logger.info({ dbName }, 'SuperApp DB indexes created');
  } catch (err) {
    logger.warn({ err, dbName }, 'SuperApp index creation warning');
  }
}

/**
 * Creates indexes for an Org Partition DB (sm_* + txn_history + chain_head).
 * Called when a new org partition DB is detected or when a SuperApp is installed.
 */
export async function createOrgPartitionIndexes(
  client: MongoClient,
  dbName: string,
  smCollectionNames: string[],
): Promise<void> {
  try {
    const db = client.db(dbName);

    const smIndexPromises = smCollectionNames.flatMap((colName) => {
      const col = db.collection(colName);
      return [
        col.createIndex(
          { '_local.state': 1, '_local.subState': 1, '_local.timestamp': -1 },
          { background: true },
        ),
        col.createIndex({ '_local.timestamp': -1 }, { background: true }),
        col.createIndex(
          { '_local.phase': 1, '_local.timestamp': -1 },
          { background: true },
        ),
      ];
    });

    const txnCol = db.collection('txn_history');
    const txnIndexPromises = [
      txnCol.createIndex({ docId: 1, sequence: 1 }, { background: true }),
      txnCol.createIndex({ rootTxn: 1 }, { background: true }),
      txnCol.createIndex({ timestamp: -1 }, { background: true }),
    ];

    await Promise.all([...smIndexPromises, ...txnIndexPromises]);
    logger.info({ dbName }, 'Org Partition DB indexes created');
  } catch (err) {
    logger.warn({ err, dbName }, 'Org partition index creation warning');
  }
}

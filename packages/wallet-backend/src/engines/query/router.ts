import { FastifyInstance } from 'fastify';
import { listDocuments, getDocument } from './documents.handler.js';
import { getDocumentChain, getDocumentDiff } from './chain.handler.js';
import { getDocumentActions } from './actions.handler.js';
import {
  listOffchainRegistry,
  getOffchainRegistryItem,
  getOffchainConfig,
  listOffchainDefinitions,
  getOffchainDefinition,
} from './offchain.handler.js';

export async function queryRouter(fastify: FastifyInstance): Promise<void> {
  // Document queries
  fastify.get('/documents', listDocuments);
  fastify.get('/documents/:docId', getDocument);
  fastify.get('/documents/:docId/actions', getDocumentActions);
  fastify.get('/documents/:docId/chain', getDocumentChain);
  fastify.get('/documents/:docId/diff', getDocumentDiff);

  // Offchain data
  fastify.get('/offchain/registry/:collectionName', listOffchainRegistry);
  fastify.get('/offchain/registry/:collectionName/:keyValue', getOffchainRegistryItem);
  fastify.get('/offchain/config/:collectionName', getOffchainConfig);
  fastify.get('/offchain/definitions', listOffchainDefinitions);
  fastify.get('/offchain/definitions/:offchainSmId', getOffchainDefinition);
}

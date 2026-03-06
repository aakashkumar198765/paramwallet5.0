import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  resolveOrgPartitionDbName,
  resolveSuperAppDbName,
  resolveWorkspaceDb,
} from '../db/resolver.js';

export interface RequestContext {
  workspace: string;
  superAppId: string | null;
  portal: string | null;
  superAppDbName: string | null;
  orgPartitionDbName: string | null;
  workspaceDbName: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    requestContext: RequestContext;
  }
}

/**
 * Reads X-Workspace, X-SuperApp-ID, X-Portal headers.
 * Computes DB names via resolver functions and attaches to request.
 * X-Workspace is always required for non-auth, non-profile routes.
 */
export async function requestContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const workspace = request.headers['x-workspace'] as string | undefined;
  const superAppId = request.headers['x-superapp-id'] as string | undefined;
  const portal = request.headers['x-portal'] as string | undefined;

  if (!workspace) {
    return reply.code(400).send({ error: 'Missing X-Workspace header' });
  }

  const workspaceDbName = resolveWorkspaceDb(workspace);
  const superAppDbName = superAppId ? resolveSuperAppDbName(workspace, superAppId) : null;
  const orgPartitionDbName =
    superAppId && portal && request.authContext?.paramId
      ? resolveOrgPartitionDbName(workspace, superAppId, request.authContext.paramId, portal)
      : null;

  request.requestContext = {
    workspace,
    superAppId: superAppId ?? null,
    portal: portal ?? null,
    superAppDbName,
    orgPartitionDbName,
    workspaceDbName,
  };
}

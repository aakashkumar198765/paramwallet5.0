import { FastifyRequest, FastifyReply } from 'fastify';
import {
  resolveWorkspaceDb,
  resolveSuperAppDbName,
} from '../db/resolver.js';

export interface RequestContext {
  workspace: string | null;
  superAppId: string | null;
  portal: string | null;
  superAppDbName: string | null;   // resolveSuperAppDbName(workspace, superAppId)
  workspaceDbName: string | null;  // resolveWorkspaceDb(workspace)
}

export async function deriveRequestContext(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const workspace = (request.headers['x-workspace'] as string | undefined) ?? null;
  const superAppId = (request.headers['x-superapp-id'] as string | undefined) ?? null;
  const portal = (request.headers['x-portal'] as string | undefined) ?? null;

  const superAppDbName =
    workspace && superAppId ? resolveSuperAppDbName(workspace, superAppId) : null;
  const workspaceDbName = workspace ? resolveWorkspaceDb(workspace) : null;

  (request as FastifyRequest & { requestContext: RequestContext }).requestContext = {
    workspace,
    superAppId,
    portal,
    superAppDbName,
    workspaceDbName,
  };
}

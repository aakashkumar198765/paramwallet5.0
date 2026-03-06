import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Document } from 'mongodb';
import { getDb } from '../db/mongo.js';

export interface PlantTeam {
  plant: string;
  teams: string[];
}

export interface PlatformContext {
  role: string;
  partnerId: string | null;
  plantTeams: PlantTeam[];
  isOrgAdmin: boolean;
  orgParamId: string;
  allUserDocs: Document[];  // all app_users docs for this user+superApp (multi-vendor support)
}

declare module 'fastify' {
  interface FastifyRequest {
    platformContext: PlatformContext;
  }
}

/**
 * Resolves the caller's role and team context from app_users in the SuperApp DB.
 * Must run AFTER authMiddleware and requestContextMiddleware.
 *
 * For vendor users, there may be multiple app_users documents (one per partnerId).
 * We return all of them in allUserDocs for the RBAC engine.
 *
 * Routes that skip this middleware:
 *   - GET /profile (no superApp context needed)
 *   - POST /auth/* (unauthenticated)
 */
export async function platformContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { superAppDbName, superAppId } = request.requestContext ?? {};
  const { userId, paramId } = request.authContext ?? {};

  if (!superAppDbName || !superAppId || !userId) {
    // No SuperApp context — skip (some routes operate at workspace level only)
    return;
  }

  const db = getDb(superAppDbName);
  const appUsersCol = db.collection('app_users');

  // Fetch ALL app_users docs for this user+superApp (handles sponsor + multi-vendor)
  const userDocs = await appUsersCol
    .find({ userId, superAppId })
    .toArray();

  if (userDocs.length === 0) {
    return reply.code(403).send({ error: 'User not registered in this SuperApp' });
  }

  // For sponsor users: one doc. For vendor users: possibly multiple (one per partnerId).
  // Pick primary context: prefer sponsor doc; fallback to first vendor doc.
  const primaryDoc = userDocs.find((d) => !d['partnerId']) ?? userDocs[0];

  request.platformContext = {
    role: primaryDoc['role'] as string,
    partnerId: primaryDoc['partnerId'] as string | null ?? null,
    plantTeams: (primaryDoc['plantTeams'] as PlantTeam[]) ?? [],
    isOrgAdmin: (primaryDoc['isOrgAdmin'] as boolean) ?? false,
    orgParamId: paramId,
    allUserDocs: userDocs,
  };
}

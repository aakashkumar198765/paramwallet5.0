import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../db/mongo.js';
import { AuthContext } from './auth.js';
import { RequestContext } from './request-context.js';
import { logger } from '../logger.js';

export interface PlatformContext {
  role: string;
  plantTeams: Array<{ plant: string; teams: string[] }>;
  isOrgAdmin: boolean;
  isWorkspaceAdmin: boolean;
  appUserDocs: AppUserDoc[];
}

export interface AppUserDoc {
  _id: string;
  userId: string;
  superAppId: string;
  email: string;
  role: string;
  partnerId?: string;
  plantTeams: Array<{ plant: string; teams: string[] }>;
  isOrgAdmin?: boolean;
  isWorkspaceAdmin?: boolean;
  status: string;
}

// Routes that skip platform context resolution
const PLATFORM_SKIP_PREFIXES = [
  '/api/v1/auth/',
  '/health',
];

const PLATFORM_SKIP_EXACT = new Set([
  '/api/v1/profile',
  '/api/v1/user/profile',
  '/api/v1/workspace/list',
  '/api/v1/workspace/create',
]);

function skipsPlatformContext(url: string): boolean {
  const path = url.split('?')[0];
  if (PLATFORM_SKIP_EXACT.has(path)) return true;
  for (const prefix of PLATFORM_SKIP_PREFIXES) {
    if (path.startsWith(prefix)) return true;
  }
  return false;
}

export async function platformContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (skipsPlatformContext(request.url)) {
    (request as FastifyRequest & { platformContext: PlatformContext | null }).platformContext = null;
    return;
  }

  const req = request as FastifyRequest & {
    authContext: AuthContext;
    requestContext: RequestContext;
    platformContext: PlatformContext | null;
  };

  const { authContext, requestContext } = req;

  if (!authContext) {
    (req as FastifyRequest & { platformContext: PlatformContext | null }).platformContext = null;
    return;
  }

  if (!requestContext.superAppDbName || !requestContext.superAppId) {
    (req as FastifyRequest & { platformContext: PlatformContext | null }).platformContext = null;
    return;
  }

  try {
    const sappDb = getDb(requestContext.superAppDbName);
    const appUsersCol = sappDb.collection<AppUserDoc>('app_users');

    // Vendor users have MULTIPLE app_users docs (one per partnerId) — fetch ALL
    const appUserDocs = await appUsersCol
      .find({ userId: authContext.userId, superAppId: requestContext.superAppId })
      .toArray();

    if (appUserDocs.length === 0) {
      (req as FastifyRequest & { platformContext: PlatformContext | null }).platformContext = null;
      return;
    }

    // Determine primary role and admin flags
    // If any doc has isWorkspaceAdmin = true → workspace admin
    // Role comes from the first doc (all docs for a user share the same role)
    const primaryDoc = appUserDocs[0];
    const isWorkspaceAdmin = appUserDocs.some(d => d.isWorkspaceAdmin === true);
    const isOrgAdmin = appUserDocs.some(d => d.isOrgAdmin === true);

    // Merge plantTeams across all docs (for vendor users across multiple partners)
    const plantTeamsMap = new Map<string, Set<string>>();
    for (const doc of appUserDocs) {
      for (const pt of doc.plantTeams ?? []) {
        if (!plantTeamsMap.has(pt.plant)) {
          plantTeamsMap.set(pt.plant, new Set());
        }
        for (const t of pt.teams ?? []) {
          plantTeamsMap.get(pt.plant)!.add(t);
        }
      }
    }

    const plantTeams = Array.from(plantTeamsMap.entries()).map(([plant, teams]) => ({
      plant,
      teams: Array.from(teams),
    }));

    req.platformContext = {
      role: primaryDoc.role,
      plantTeams,
      isOrgAdmin,
      isWorkspaceAdmin,
      appUserDocs,
    };
  } catch (err) {
    logger.error({ err }, 'Failed to resolve platform context');
    // Non-fatal — set to null so routes can handle gracefully
    (req as FastifyRequest & { platformContext: PlatformContext | null }).platformContext = null;
  }
}

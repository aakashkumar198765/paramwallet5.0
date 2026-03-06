import { PlatformContext } from './platform-context.js';

export class ForbiddenError extends Error {
  constructor(message = 'FORBIDDEN') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function requireWorkspaceAdmin(platformContext: PlatformContext | null): void {
  if (!platformContext || !platformContext.isWorkspaceAdmin) {
    throw new ForbiddenError('Workspace admin access required');
  }
}

export function requireOrgAdmin(platformContext: PlatformContext | null): void {
  if (!platformContext || !platformContext.isOrgAdmin) {
    throw new ForbiddenError('Org admin access required');
  }
}

export function requireRole(
  platformContext: PlatformContext | null,
  roles: string[]
): void {
  if (!platformContext || !roles.includes(platformContext.role)) {
    throw new ForbiddenError(`Role ${roles.join(' or ')} required`);
  }
}

export function requireAuthenticated(platformContext: PlatformContext | null): void {
  if (!platformContext) {
    throw new ForbiddenError('SuperApp context required');
  }
}

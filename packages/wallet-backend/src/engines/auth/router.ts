import type { FastifyInstance } from 'fastify';
import { otpHandlers } from './otp.handler.js';
import { ssoHandlers } from './sso.handler.js';
import { sessionHandlers } from './session.handler.js';
import { authMiddleware } from '../../middleware/auth.js';

/**
 * Engine 3: Auth Gate
 * Mounts all auth-related routes.
 * OTP and SSO are public; session endpoints require auth.
 */
export async function authRouter(app: FastifyInstance): Promise<void> {
  // Public auth routes (no middleware)
  await otpHandlers(app);
  await ssoHandlers(app);

  // Session routes requiring auth
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authMiddleware);
    await sessionHandlers(protectedApp);
  });
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { anyCol } from '../../db/mongo.js';
import { resolveAuthDb, resolveSaasDb } from '../../db/resolver.js';
import { SsoLoginSchema } from './schemas.js';
import { verifySso } from './enn-client.js';

async function handleSsoLogin(
  request: FastifyRequest<{ Params: { provider: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const body = SsoLoginSchema.parse(request.body);
  const { provider } = request.params;

  const ennResult = await verifySso(provider, body.code, body.verifierId);
  if (!ennResult.status) {
    return reply.code(401).send({ error: ennResult.message ?? 'SSO verification failed' });
  }

  const ennData = ennResult.data ?? {};
  const email = (ennData['email'] as string | undefined) ?? '';
  let paramId = (ennData['paramId'] as string | undefined) ?? '';

  if (!email) return reply.code(401).send({ error: 'SSO response missing email' });

  if (!paramId) {
    const user = await anyCol(resolveSaasDb(), 'subdomain_users').findOne({ email });
    if (!user) return reply.code(401).send({ error: 'User not found' });
    paramId = user['paramId'] as string;
  }

  const userId = createHash('sha256').update(email.toLowerCase()).digest('hex');
  const token = jwt.sign(
    { userId, email, paramId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN },
  );
  const refreshToken = uuidv4();
  const sessionId = `session:${createHash('sha256').update(token).digest('hex')}`;
  const now = Date.now();

  await anyCol(resolveAuthDb(), paramId).insertOne({
    _id: sessionId,
    userId,
    email,
    paramId,
    token: createHash('sha256').update(token).digest('hex'),
    refreshToken,
    createdAt: now,
    expiresAt: now + config.JWT_EXPIRES_IN * 1000,
    refreshExpiresAt: now + config.REFRESH_TOKEN_EXPIRES_IN * 1000,
  });

  return reply.send({ token, refreshToken, user: { userId, email, paramId }, enn: ennData });
}

export async function ssoHandlers(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { provider: string } }>('/auth/sso/:provider', handleSsoLogin);
}

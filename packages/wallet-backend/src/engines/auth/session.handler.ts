import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { anyCol } from '../../db/mongo.js';
import { resolveAuthDb } from '../../db/resolver.js';
import { RefreshTokenSchema, AddAppSchema, DomainRegisterSchema } from './schemas.js';
import { registerExchange, onboardPartner } from './enn-client.js';
import { authMiddleware } from '../../middleware/auth.js';

async function handleRefresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = RefreshTokenSchema.parse(request.body);
  const col = anyCol(resolveAuthDb(), body.paramId);
  const session = await col.findOne({ refreshToken: body.refreshToken });

  if (!session) return reply.code(401).send({ error: 'Invalid or expired refresh token' });
  if ((session['refreshExpiresAt'] as number) < Date.now()) {
    await col.deleteOne({ _id: session['_id'] });
    return reply.code(401).send({ error: 'Refresh token expired' });
  }

  await col.deleteOne({ _id: session['_id'] });

  const newToken = jwt.sign(
    { userId: session['userId'], email: session['email'], paramId: body.paramId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN },
  );
  const newRefreshToken = uuidv4();
  const newSessionId = `session:${createHash('sha256').update(newToken).digest('hex')}`;
  const now = Date.now();

  await col.insertOne({
    _id: newSessionId,
    userId: session['userId'],
    email: session['email'],
    paramId: body.paramId,
    token: createHash('sha256').update(newToken).digest('hex'),
    refreshToken: newRefreshToken,
    createdAt: now,
    expiresAt: now + config.JWT_EXPIRES_IN * 1000,
    refreshExpiresAt: now + config.REFRESH_TOKEN_EXPIRES_IN * 1000,
  });

  return reply.send({ token: newToken, refreshToken: newRefreshToken });
}

async function handleLogout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { paramId, sessionId } = request.authContext;
  await anyCol(resolveAuthDb(), paramId).deleteOne({ _id: sessionId });
  return reply.send({ status: 'logged_out' });
}

async function handleAddApp(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = AddAppSchema.parse(request.body);
  const result = await registerExchange({
    subdomain: body.subdomain,
    exchangeParamId: body.exchangeParamId,
    userId: request.authContext.userId,
    paramId: request.authContext.paramId,
  });
  if (!result.status) return reply.code(400).send({ error: result.message ?? 'Exchange registration failed' });
  return reply.send({ status: 'registered', data: result.data });
}

async function handleDomainRegister(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = DomainRegisterSchema.parse(request.body);
  const result = await onboardPartner(body.email, body.subdomain);
  if (!result.status) return reply.code(400).send({ error: result.message ?? 'Domain registration failed' });
  return reply.send({ status: 'registered', data: result.data });
}

export async function sessionHandlers(app: FastifyInstance): Promise<void> {
  app.post('/auth/refresh', handleRefresh);
  app.post('/auth/logout', { preHandler: [authMiddleware] }, handleLogout);
  app.post('/auth/addapp', { preHandler: [authMiddleware] }, handleAddApp);
  app.post('/auth/domain/register', handleDomainRegister);
}

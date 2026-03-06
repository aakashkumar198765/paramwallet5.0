import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { Document } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/mongo.js';
import { resolveAuthDb } from '../../db/resolver.js';
import { ensureAuthSessionIndexes } from '../../db/indexes.js';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import { registerExchange } from './enn-client.js';
import { RefreshTokenSchema, AddAppSchema } from './schemas.js';
import type { AuthContext } from '../../middleware/auth.js';

export async function handleRefreshToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = RefreshTokenSchema.parse(request.body);

  // Spec 17.3: X-Param-ID required for refresh
  const paramId = request.headers['x-param-id'] as string | undefined;
  if (!paramId) {
    return reply.status(401).send({ error: 'Missing X-Param-ID header' });
  }

  const authDb = getDb(resolveAuthDb());
  const sessionCol = authDb.collection(paramId);

  const session = await sessionCol.findOne({ refreshToken: body.refreshToken });

  if (!session) {
    return reply.status(401).send({ error: 'Invalid refresh token' });
  }

  // If refresh token expired — delete and reject
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    await sessionCol.deleteOne({ _id: session._id });
    return reply.status(401).send({ error: 'Refresh token expired' });
  }

  // Delete old session
  await sessionCol.deleteOne({ _id: session._id });

  // Issue new token pair
  const tokenPayload = {
    userId: session.userId as string,
    email: session.email as string,
    paramId,
  };
  const newToken = jwt.sign(tokenPayload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
  const newRefreshToken = uuidv4();

  const tokenHash = createHash('sha256').update(newToken).digest('hex');
  const sessionId = `session:${tokenHash}`;

  const now = Date.now();
  const expiresAt = now + config.JWT_EXPIRES_IN * 1000;

  await ensureAuthSessionIndexes(paramId);

  await sessionCol.insertOne({
    _id: sessionId,
    userId: session.userId,
    email: session.email,
    paramId,
    pennId: session.pennId ?? null,
    token: newToken,
    refreshToken: newRefreshToken,
    issuedAt: now,
    expiresAt,
    createdAt: now,
    lastActiveAt: now,
    deviceInfo: session.deviceInfo ?? null,
  } as unknown as Document);

  // Spec response: { token, refreshToken, expiresAt (ms), user: { userId, email, paramId } }
  return reply.status(200).send({
    token: newToken,
    refreshToken: newRefreshToken,
    expiresAt,
    user: {
      userId: session.userId,
      email: session.email,
      paramId,
    },
  });
}

export async function handleLogout(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest & { authContext: AuthContext };
  const { token, paramId } = req.authContext;

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const sessionId = `session:${tokenHash}`;

  const authDb = getDb(resolveAuthDb());
  const sessionCol = authDb.collection(paramId);

  await sessionCol.deleteOne({ _id: sessionId as unknown as string });

  // Spec response: { "status": "logged_out" }
  return reply.status(200).send({ status: 'logged_out' });
}

export async function handleAddApp(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = AddAppSchema.parse(request.body);
  const req = request as FastifyRequest & { authContext: AuthContext };

  logger.info({ appId: body.appId }, 'addapp — calling ENN /v2/register_exchange');

  // Spec body to ENN: { appId, publicKey, keystoreData }
  const ennResult = await registerExchange({
    appId: body.appId,
    publicKey: body.publicKey,
    ...(body.keystoreData ? { keystoreData: body.keystoreData } : {}),
  });

  if (!ennResult.success) {
    // Spec: 502 on ENN failure
    return reply.status(502).send({ error: ennResult.message ?? 'App registration failed' });
  }

  // Spec response: { "status": "registered", "exchangeId": "..." }
  const data = ennResult.data as Record<string, unknown> | undefined;
  return reply.status(200).send({
    status: 'registered',
    exchangeId: (data?.exchangeId as string) ?? null,
  });
}

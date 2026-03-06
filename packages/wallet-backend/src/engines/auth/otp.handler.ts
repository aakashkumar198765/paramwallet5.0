import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { anyCol } from '../../db/mongo.js';
import { resolveAuthDb, resolveSaasDb } from '../../db/resolver.js';
import { OtpRequestSchema, OtpVerifySchema } from './schemas.js';
import { sendOtp, verifyOtp, decryptEnnPayload } from './enn-client.js';

async function handleOtpRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = OtpRequestSchema.parse(request.body);
  const ennResult = await sendOtp(body.email);
  if (!ennResult.status) {
    return reply.code(400).send({ error: ennResult.message ?? 'Failed to send OTP' });
  }
  return reply.send({ status: 'sent' });
}

async function handleOtpVerify(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = OtpVerifySchema.parse(request.body);
  const ennResult = await verifyOtp(body.email, body.otp);
  const encryptedPayload = ennResult.data?.encryptedPayload;

  if (!ennResult.status || !encryptedPayload) {
    return reply.code(401).send({ error: ennResult.message ?? 'OTP verification failed' });
  }

  const decrypted = decryptEnnPayload(encryptedPayload, body.otp);
  const userId = createHash('sha256').update(body.email.toLowerCase()).digest('hex');
  const paramId = decrypted.paramId;

  const token = jwt.sign(
    { userId, email: body.email, paramId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN },
  );
  const refreshToken = uuidv4();
  const sessionId = `session:${createHash('sha256').update(token).digest('hex')}`;

  const now = Date.now();
  await anyCol(resolveAuthDb(), paramId).insertOne({
    _id: sessionId,
    userId,
    email: body.email,
    paramId,
    token: createHash('sha256').update(token).digest('hex'),
    refreshToken,
    createdAt: now,
    expiresAt: now + config.JWT_EXPIRES_IN * 1000,
    refreshExpiresAt: now + config.REFRESH_TOKEN_EXPIRES_IN * 1000,
  });

  await anyCol(resolveSaasDb(), 'subdomain_users').updateOne(
    { userId },
    {
      $set: { email: body.email, userId, paramId, updatedAt: now },
      $setOnInsert: { _id: `user:${userId}`, name: '', subdomains: [], createdAt: now },
    },
    { upsert: true },
  );

  return reply.send({
    token,
    refreshToken,
    user: { userId, email: body.email, paramId, pennId: decrypted.pennId },
    enn: { paramId: decrypted.paramId, pennId: decrypted.pennId, publicKey: decrypted.publicKey },
  });
}

export async function otpHandlers(app: FastifyInstance): Promise<void> {
  app.post('/auth/otp/request', handleOtpRequest);
  app.post('/auth/otp/verify', handleOtpVerify);
}

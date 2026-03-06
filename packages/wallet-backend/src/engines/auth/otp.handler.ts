import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { Document } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/mongo.js';
import { resolveAuthDb, resolveDomainDb } from '../../db/resolver.js';
import { ensureAuthSessionIndexes } from '../../db/indexes.js';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import {
  sendOtp,
  verifyOtp,
  decryptEnnPayload,
} from './enn-client.js';
import {
  OtpRequestSchema,
  OtpVerifySchema,
} from './schemas.js';

export async function handleOtpRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = OtpRequestSchema.parse(request.body);
  logger.info({ email: body.email }, 'OTP request — calling ENN /v2/send_otp');

  const result = await sendOtp(body.email);

  if (!result.success) {
    // Spec: 502 if ENN returns status: false or is unreachable
    return reply.status(502).send({ error: result.message ?? 'Failed to send OTP' });
  }

  // Spec response: { "status": "sent", "message": "OTP sent to email" }
  return reply.status(200).send({ status: 'sent', message: 'OTP sent to email' });
}

export async function handleOtpVerify(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = OtpVerifySchema.parse(request.body);

  // Step 1: Call ENN /v2/verify_otp
  const ennResult = await verifyOtp(body.email, body.otp);

  // Step 2: If ENN fails → 401
  if (!ennResult.success) {
    return reply.status(401).send({ error: ennResult.message ?? 'Invalid OTP' });
  }

  // Step 3: Decrypt encryptedPayload — extract ethID, paramID (EHPI), publicKey
  let decryptedEnn: ReturnType<typeof decryptEnnPayload> | null = null;
  try {
    if (ennResult.encryptedPayload) {
      decryptedEnn = decryptEnnPayload(ennResult.encryptedPayload, body.otp);
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to decrypt ENN payload — enn block will be omitted');
    // Non-fatal: enn block omitted in response per spec
  }

  // Step 4: Resolve paramId — order: (a) subdomain_users.paramId, (b) ethID from decrypt, (c) legacy fallback
  const domainDb = getDb(resolveDomainDb());
  const subdomain_users = domainDb.collection('subdomain_users');
  const existingUser = await subdomain_users.findOne({ email: body.email });

  const paramId: string =
    (existingUser?.paramId as string | undefined) ||
    decryptedEnn?.paramId ||
    (ennResult.ethID as string | undefined) ||
    (ennResult.data?.ethID as string | undefined) ||
    '';

  if (!paramId) {
    logger.error({ email: body.email }, 'Cannot resolve paramId from ENN or user store');
    return reply.status(502).send({ error: 'Session creation failed' });
  }

  // Step 5: userId = SHA256(email.toLowerCase())
  const userId = createHash('sha256').update(body.email.toLowerCase()).digest('hex');

  // Step 6: Generate JWT { userId, email, paramId, exp } + UUID refresh token
  const tokenPayload = { userId, email: body.email, paramId };
  const token = jwt.sign(tokenPayload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
  const refreshToken = uuidv4();

  // Step 7: Store session in param_auth.{paramId}
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const sessionId = `session:${tokenHash}`;

  const authDb = getDb(resolveAuthDb());
  const sessionCol = authDb.collection(paramId);
  await ensureAuthSessionIndexes(paramId);

  const now = Date.now();
  const expiresAt = now + config.JWT_EXPIRES_IN * 1000;

  await sessionCol.insertOne({
    _id: sessionId,
    userId,
    email: body.email,
    paramId,
    pennId: decryptedEnn?.pennId ?? null,
    token,
    refreshToken,
    issuedAt: now,
    expiresAt,
    createdAt: now,
    lastActiveAt: now,
    deviceInfo: body.deviceId ? { deviceId: body.deviceId } : null,
  } as unknown as Document);

  // Step 8: Return response — enn block only when decrypted successfully
  const response: Record<string, unknown> = {
    token,
    refreshToken,
    expiresAt,
    isTermsAndConditionVerified: (ennResult.data?.isTermsAndConditionVerified as boolean) ?? false,
    user: {
      userId,
      email: body.email,
    },
  };

  if (decryptedEnn) {
    response.enn = {
      paramId: decryptedEnn.paramId,
      pennId: decryptedEnn.pennId ?? null,
      publicKey: decryptedEnn.publicKey ?? null,
    };
  }

  return reply.status(200).send(response);
}

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
import { verifySso, onboardPartner } from './enn-client.js';
import { SsoVerifySchema, DomainRegisterSchema } from './schemas.js';

interface SsoParams {
  provider: string;
}

export async function handleSsoVerify(
  request: FastifyRequest<{ Params: SsoParams }>,
  reply: FastifyReply
): Promise<void> {
  const { provider } = request.params;
  const body = SsoVerifySchema.parse(request.body);

  // Step 1: Resolve verifierId from config
  const verifierId = (config as Record<string, unknown>).verifierMap
    ? ((config as Record<string, unknown>).verifierMap as Record<string, string>)[provider]
    : provider;

  // Step 2: Call ENN /v2/verify_sso
  const ennResult = await verifySso(provider, body.code, verifierId ?? provider);

  // Step 3: If ENN fails → 401
  if (!ennResult.success) {
    return reply.status(401).send({ error: ennResult.message ?? 'SSO verification failed' });
  }

  // Step 4: Get email from ENN response — 401 if empty
  const email = (ennResult.data?.email as string) ?? '';
  if (!email) {
    return reply.status(401).send({ error: 'ENN did not return email for SSO' });
  }

  // Step 5: Resolve paramId — ENN response first, then subdomain_users fallback
  let paramId: string = (ennResult.data?.paramId as string) ?? (ennResult.ethID as string) ?? '';
  if (!paramId) {
    const domainDb = getDb(resolveDomainDb());
    const existingUser = await domainDb.collection('subdomain_users').findOne({ email });
    paramId = (existingUser?.paramId as string | undefined) ?? '';
  }

  if (!paramId) {
    return reply.status(401).send({ error: 'Cannot resolve paramId for SSO user' });
  }

  // Step 6: userId = SHA256(email.toLowerCase())
  const userId = createHash('sha256').update(email.toLowerCase()).digest('hex');

  // Step 7: Generate JWT + refresh token, store session
  const tokenPayload = { userId, email, paramId };
  const token = jwt.sign(tokenPayload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
  const refreshToken = uuidv4();

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const sessionId = `session:${tokenHash}`;

  const authDb = getDb(resolveAuthDb());
  const sessionCol = authDb.collection('sessions');
  await ensureAuthSessionIndexes();

  const now = Date.now();
  const expiresAt = now + config.JWT_EXPIRES_IN * 1000;

  await sessionCol.insertOne({
    _id: sessionId,
    userId,
    email,
    paramId,
    pennId: null,
    token,
    refreshToken,
    issuedAt: now,
    expiresAt,
    createdAt: now,
    lastActiveAt: now,
    // Spec §12: deviceInfo = { ua, ip } — capture from HTTP request headers
    deviceInfo: {
      ua: (request.headers['user-agent'] as string) ?? null,
      ip: request.ip ?? null,
      ...(body.deviceId ? { deviceId: body.deviceId } : {}),
    },
  } as unknown as Document);

  // Spec SSO response — no enn block, no isTermsAndConditionVerified
  return reply.status(200).send({
    token,
    refreshToken,
    expiresAt,
    user: {
      userId,
      email,
      paramId,
    },
  });
}

export async function handleDomainRegister(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = DomainRegisterSchema.parse(request.body);

  // Spec 17.4: Call ENN /v4/onboard with exchangeEnnKey header
  // exchangeEnnKey comes from request header or config
  const exchangeEnnKey =
    (request.headers['param_exchange_enn_key'] as string) || config.ENN_EXCHANGE_KEY;

  const ennResult = await onboardPartner(body.email, body.subdomain, exchangeEnnKey);

  if (!ennResult.success) {
    // 502 if ENN unavailable
    if (ennResult.error === 'ENN_TIMEOUT') {
      return reply.status(502).send({ error: 'ENN service unavailable' });
    }
    // 409 if email already registered for subdomain
    if (
      ennResult.message?.toLowerCase().includes('already') ||
      ennResult.message?.toLowerCase().includes('exists')
    ) {
      return reply.status(409).send({ error: ennResult.message });
    }
    return reply.status(502).send({ error: ennResult.message ?? 'Partner registration failed' });
  }

  // Spec response: { paramId: ethId (0x address), pennId: paramId (EHPI) }
  const data = ennResult.data as Record<string, unknown> | undefined;
  return reply.status(200).send({
    paramId: ennResult.ethID ?? (data?.ethId as string) ?? null,
    pennId: ennResult.paramID ?? (data?.paramId as string) ?? null,
  });
}

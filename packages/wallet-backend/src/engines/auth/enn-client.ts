import { createHash, createDecipheriv } from 'crypto';
import got from 'got';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

export interface EnnResponse {
  success: boolean;
  status?: string;
  message?: string;
  data?: Record<string, unknown>;
  encryptedPayload?: string;
  ethID?: string;
  paramID?: string;
  error?: string;
}

export interface DecryptedEnnPayload {
  paramId: string;    // ethID → paramId (0x address)
  pennId?: string;    // paramID → pennId (EHPI code)
  publicKey?: string; // public key from encrypted payload
  email?: string;
  [key: string]: unknown;
}

const ennClient = got.extend({
  prefixUrl: config.ENN_BASE_URL,
  timeout: { request: 15_000 },
  retry: { limit: 0 },
  headers: {
    'Content-Type': 'application/json',
    'app-key': config.ENN_APP_KEY,
  },
  throwHttpErrors: false,  // ENN returns HTTP 500 for business errors — handle manually
});

/**
 * Decrypt ENN encrypted payload.
 * Algorithm: AES-256-CTR
 * Key: SHA256(otp)
 * IV: first 16 bytes of key
 */
export function decryptEnnPayload(encryptedPayload: string, otp: string): DecryptedEnnPayload {
  const key = createHash('sha256').update(otp).digest();
  const iv = key.slice(0, 16);
  const decipher = createDecipheriv('aes-256-ctr', key, iv);
  const decrypted =
    decipher.update(Buffer.from(encryptedPayload, 'base64')).toString('utf8') +
    decipher.final('utf8');

  const parsed = JSON.parse(decrypted) as Record<string, unknown>;

  // Field mapping: ethID → paramId, paramID → pennId
  return {
    ...parsed,
    paramId: (parsed.ethID ?? parsed.paramId ?? '') as string,
    pennId: (parsed.paramID ?? parsed.pennId) as string | undefined,
  };
}

export async function sendOtp(email: string): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v2/send_otp', {
      json: { email },
    });

    const body = JSON.parse(response.body as string) as Record<string, unknown>;
    logger.debug({ email, status: response.statusCode, body }, 'ENN sendOtp response');

    // ENN response format: { res: "success"|"error", status: true|false, message: "..." }
    if (body.status === false || body.res === 'error') {
      return { success: false, message: (body.message as string) ?? 'Failed to send OTP' };
    }

    return { success: true, message: (body.message as string) ?? 'OTP sent' };
  } catch (err) {
    logger.error({ err, email }, 'ENN sendOtp network error');
    return { success: false, message: 'ENN service unavailable', error: 'ENN_TIMEOUT' };
  }
}

export async function verifyOtp(email: string, otp: string): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v2/verify_otp', {
      json: { email, otp },
    });

    const body = JSON.parse(response.body as string) as Record<string, unknown>;
    logger.debug({ email, status: response.statusCode, body }, 'ENN verifyOtp response');

    // ENN returns HTTP 500 for invalid OTP — check body.status, not HTTP status
    if (body.status === false || body.res === 'error') {
      return { success: false, message: (body.message as string) ?? 'OTP verification failed' };
    }

    // Success - extract data
    const data = body.data as Record<string, unknown> | undefined;
    return {
      success: true,
      message: (body.message as string) ?? 'OTP verified',
      data,
      encryptedPayload: (data?.encryptedPayload as string) ?? undefined,
      ethID: (data?.ethID as string) ?? undefined,
      paramID: (data?.paramID as string) ?? undefined,
    };
  } catch (err) {
    logger.error({ err, email }, 'ENN verifyOtp network error');
    return { success: false, message: 'ENN service unavailable', error: 'ENN_TIMEOUT' };
  }
}

export async function verifySso(
  provider: string,
  code: string,
  verifierId: string
): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v2/verify_sso', {
      json: { provider, idToken: code, verifierId },
    });

    const body = JSON.parse(response.body as string) as Record<string, unknown>;
    logger.debug({ provider, status: response.statusCode, body }, 'ENN verifySso response');

    if (body.status === false || body.res === 'error') {
      return { success: false, message: (body.message as string) ?? 'SSO verification failed' };
    }

    const data = body.data as Record<string, unknown> | undefined;
    return {
      success: true,
      message: (body.message as string) ?? 'SSO verified',
      data,
      ethID: (data?.paramId as string) ?? (data?.ethID as string) ?? undefined,
    };
  } catch (err) {
    logger.error({ err, provider }, 'ENN verifySso network error');
    return { success: false, message: 'ENN service unavailable', error: 'ENN_TIMEOUT' };
  }
}

export async function registerExchange(payload: Record<string, unknown>): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v2/register_exchange', {
      json: payload,
    });

    const body = JSON.parse(response.body as string) as EnnResponse;
    if (response.statusCode >= 500) {
      return { success: false, message: body.message ?? 'Exchange registration failed' };
    }

    return body;
  } catch (err) {
    logger.error({ err }, 'ENN registerExchange network error');
    throw new Error('ENN_TIMEOUT');
  }
}

export async function onboardPartner(
  email: string,
  subdomain: string,
  exchangeEnnKey: string
): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v4/onboard', {
      searchParams: { email, subdomain },
      headers: {
        'param_exchange_enn_key': exchangeEnnKey,
        'subdomain_name': subdomain,
      },
    });

    const body = JSON.parse(response.body as string) as Record<string, unknown>;
    logger.debug({ email, subdomain, status: response.statusCode, body }, 'ENN onboardPartner response');

    if (body.status === false || body.res === 'error') {
      return { success: false, message: (body.message as string) ?? 'Partner onboarding failed' };
    }

    const data = body.data as Record<string, unknown> | undefined;
    return {
      success: true,
      data,
      // ENN returns ethId (0x address) and paramId (EHPI) — map to platform names
      ethID: (data?.ethId as string) ?? undefined,
      paramID: (data?.paramId as string) ?? undefined,
    };
  } catch (err) {
    logger.error({ err, email, subdomain }, 'ENN onboardPartner network error');
    return { success: false, message: 'ENN service unavailable', error: 'ENN_TIMEOUT' };
  }
}

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
 * OpenSSL EVP_BytesToKey — matches CryptoJS string-passphrase key derivation.
 * MD5, 1 iteration, derives 32-byte key + 16-byte IV.
 */
function evpKdf(passphrase: Buffer, salt: Buffer): { key: Buffer; iv: Buffer } {
  let derived = Buffer.alloc(0);
  let prev = Buffer.alloc(0);
  while (derived.length < 48) {
    prev = createHash('md5').update(Buffer.concat([prev, passphrase, salt])).digest();
    derived = Buffer.concat([derived, prev]);
  }
  return { key: derived.slice(0, 32), iv: derived.slice(32, 48) };
}

/**
 * Decrypt ENN encrypted payload.
 *
 * Spec: decryptionKey = SHA256(otp) as 64-char hex string, passed as CryptoJS string
 * passphrase → CryptoJS uses OpenSSL EVP_BytesToKey internally.
 * Ciphertext format (base64): "Salted__" (8 bytes) + salt (8 bytes) + AES-256-CTR ciphertext.
 */
export function decryptEnnPayload(encryptedPayload: string, otp: string): DecryptedEnnPayload {
  // Spec: key = SHA256(otp) as hex string (64 chars), used as CryptoJS string passphrase
  const passphrase = Buffer.from(createHash('sha256').update(otp).digest('hex'), 'utf8');

  const raw = Buffer.from(encryptedPayload, 'base64');

  // CryptoJS OpenSSL format: "Salted__" (8 bytes) + random salt (8 bytes) + ciphertext
  if (raw.length < 16 || raw.slice(0, 8).toString('ascii') !== 'Salted__') {
    throw new Error('Unexpected ENN payload format — expected CryptoJS OpenSSL Salted__ format');
  }

  const salt = raw.slice(8, 16);
  const ct = raw.slice(16);

  const { key, iv } = evpKdf(passphrase, salt);
  const decipher = createDecipheriv('aes-256-ctr', key, iv);
  let decryptedBuf = Buffer.concat([decipher.update(ct), decipher.final()]);

  // CryptoJS applies PKCS7 padding even in CTR mode.
  // Node.js aes-256-ctr does NOT auto-strip it — strip manually.
  const padByte = decryptedBuf[decryptedBuf.length - 1];
  if (padByte > 0 && padByte <= 16) {
    const padding = decryptedBuf.slice(decryptedBuf.length - padByte);
    if (padding.every((b) => b === padByte)) {
      decryptedBuf = decryptedBuf.slice(0, decryptedBuf.length - padByte);
    }
  }

  const parsed = JSON.parse(decryptedBuf.toString('utf8')) as Record<string, unknown>;

  // Field mapping: ENN's ethID → platform paramId (0x address), ENN's paramID → pennId (EHPI code)
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

    const body = JSON.parse(response.body as string) as Record<string, unknown>;
    logger.debug({ status: response.statusCode, body }, 'ENN registerExchange response');

    // HIGH-10 + MED-2 fix: Check body.status/body.res like all other ENN functions.
    // ENN may return HTTP 200 with { status: false, res: 'error' } for business failures.
    // Previously this checked HTTP status code only and returned raw body (body.success = undefined).
    if (body.status === false || body.res === 'error') {
      return { success: false, message: (body.message as string) ?? 'Exchange registration failed' };
    }

    const data = body.data as Record<string, unknown> | undefined;
    return {
      success: true,
      message: (body.message as string) ?? 'Exchange registered',
      data,
    };
  } catch (err) {
    logger.error({ err }, 'ENN registerExchange network error');
    return { success: false, message: 'ENN service unavailable', error: 'ENN_TIMEOUT' };
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

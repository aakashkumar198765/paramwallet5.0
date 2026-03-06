import got from 'got';
import { createHash, createDecipheriv } from 'crypto';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

export interface EnnResponse {
  res?: string;
  status: boolean | string;
  message?: string;
  data?: {
    isTermsAndConditionVerified?: boolean;
    encryptedPayload?: string;
    [key: string]: unknown;
  };
}

export interface DecryptedEnnPayload {
  paramId: string;   // ethID in ENN response → our paramId
  pennId?: string;   // paramID in ENN response → our pennId
  publicKey?: string;
  email?: string;
}

const ennClient = got.extend({
  prefixUrl: config.ENN_BASE_URL,
  timeout: { request: 15000 },
  retry: { limit: 0 },
  throwHttpErrors: false,
  headers: {
    'app-key': config.ENN_APP_KEY,
    'Content-Type': 'application/json',
  },
});

/**
 * Derives AES-256 key + IV from a password and salt using
 * OpenSSL EVP_BytesToKey (MD5, 1 iteration) — same as CryptoJS default.
 */
function evpBytesToKey(
  password: Buffer,
  salt: Buffer,
  keyLen: number,
  ivLen: number,
): { key: Buffer; iv: Buffer } {
  let result = Buffer.alloc(0);
  let prev = Buffer.alloc(0);
  while (result.length < keyLen + ivLen) {
    prev = createHash('md5').update(Buffer.concat([prev, password, salt])).digest();
    result = Buffer.concat([result, prev]);
  }
  return { key: result.subarray(0, keyLen), iv: result.subarray(keyLen, keyLen + ivLen) };
}

/**
 * Decrypts ENN encryptedPayload (CryptoJS AES-256-CTR, OpenSSL Salted__ format).
 * The payload is Base64-encoded with the structure:
 *   Bytes 0-7  : "Salted__" magic header
 *   Bytes 8-15 : 8-byte random salt
 *   Bytes 16+  : AES-256-CTR ciphertext
 * Key + IV derived via EVP_BytesToKey(MD5, password=SHA256(otp) hex string, salt).
 * Matches: CryptoJS.AES.decrypt(payload, SHA256(otp).toString(), { mode: CryptoJS.mode.CTR })
 */
export function decryptEnnPayload(encryptedPayload: string, otp: string): DecryptedEnnPayload {
  const encBuf = Buffer.from(encryptedPayload, 'base64');
  const salt = encBuf.subarray(8, 16);          // skip "Salted__", grab salt
  const ciphertext = encBuf.subarray(16);
  // Password = SHA256(otp) as 64-char hex string — matches CryptoJS string-password behaviour
  const sha256HexStr = createHash('sha256').update(otp).digest('hex');
  const { key, iv } = evpBytesToKey(Buffer.from(sha256HexStr), salt, 32, 16);
  const decipher = createDecipheriv('aes-256-ctr', key, iv);
  const raw = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  // Strip PKCS7 padding added by CryptoJS before CTR encryption
  const padLen = raw[raw.length - 1];
  const plaintext = (padLen > 0 && padLen <= 16) ? raw.subarray(0, raw.length - padLen) : raw;
  const parsed = JSON.parse(plaintext.toString('utf8')) as Record<string, unknown>;
  return {
    paramId: parsed['ethID'] as string,
    pennId: parsed['paramID'] as string | undefined,
    publicKey: parsed['publicKey'] as string | undefined,
    email: parsed['email'] as string | undefined,
  };
}

export async function sendOtp(email: string): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v2/send_otp', {
      json: { email, appKey: config.ENN_APP_KEY },
    });
    return JSON.parse(response.body) as EnnResponse;
  } catch (err) {
    logger.error({ err }, 'ENN sendOtp network error');
    throw new Error('Auth service unavailable');
  }
}

export async function verifyOtp(email: string, otp: string): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v2/verify_otp', {
      json: { email, otp, appKey: config.ENN_APP_KEY },
    });
    return JSON.parse(response.body) as EnnResponse;
  } catch (err) {
    logger.error({ err }, 'ENN verifyOtp network error');
    throw new Error('Auth service unavailable');
  }
}

export async function verifySso(
  provider: string,
  code: string,
  verifierId?: string,
): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v2/verify_sso', {
      json: { provider, code, verifierId, appKey: config.ENN_APP_KEY },
    });
    return JSON.parse(response.body) as EnnResponse;
  } catch (err) {
    logger.error({ err }, 'ENN verifySso network error');
    throw new Error('Auth service unavailable');
  }
}

export async function registerExchange(payload: Record<string, unknown>): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v2/register_exchange', {
      json: { ...payload, exchangeKey: config.ENN_EXCHANGE_KEY },
    });
    return JSON.parse(response.body) as EnnResponse;
  } catch (err) {
    logger.error({ err }, 'ENN registerExchange network error');
    throw new Error('Auth service unavailable');
  }
}

export async function onboardPartner(
  email: string,
  subdomain: string,
  extraHeaders?: Record<string, string>,
): Promise<EnnResponse> {
  try {
    const response = await ennClient.post('v4/onboard', {
      json: { email, subdomain, exchangeKey: config.ENN_EXCHANGE_KEY },
      headers: extraHeaders,
    });
    return JSON.parse(response.body) as EnnResponse;
  } catch (err) {
    logger.error({ err }, 'ENN onboardPartner network error');
    throw new Error('Auth service unavailable');
  }
}

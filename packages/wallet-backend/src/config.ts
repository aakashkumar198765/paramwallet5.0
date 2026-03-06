import { z } from 'zod';

const envSchema = z.object({
  MONGO_URI: z.string().default('mongodb://localhost:27017'),
  MONGO_POOL_SIZE: z.coerce.number().default(10),
  NATS_URL: z.string().default('nats://localhost:4222'),
  ENN_BASE_URL: z.string().default('https://keystore.paramwallet.com:8006'),
  // ENN_APP_KEY is REQUIRED — the exchange app-key registered with ENN.
  // Empty value causes ENN to fail with DynamoDB ValidationException (Key: _id cannot be empty).
  ENN_APP_KEY: z.string().min(1, 'ENN_APP_KEY is required and must not be empty'),
  // ENN_EXCHANGE_KEY is REQUIRED for partner onboarding (/v4/onboard).
  ENN_EXCHANGE_KEY: z.string().min(1, 'ENN_EXCHANGE_KEY is required and must not be empty'),
  JWT_SECRET: z.string().min(32).default('dev-secret-32-chars-minimum-reqd!!'),
  JWT_EXPIRES_IN: z.coerce.number().default(3600),
  REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().default(604800),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
});

export const config = envSchema.parse(process.env);
export type Config = typeof config;

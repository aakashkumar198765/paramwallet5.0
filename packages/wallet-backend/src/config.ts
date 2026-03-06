import { z } from 'zod';

const configSchema = z.object({
  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017'),
  MONGO_POOL_SIZE: z.coerce.number().int().positive().default(10),
  NATS_URL: z.string().min(1).default('nats://localhost:4222'),
  ENN_BASE_URL: z.string().url(),
  ENN_APP_KEY: z.string().min(1),
  ENN_EXCHANGE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(3600),
  REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().int().positive().default(604800),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }
  return result.data;
}

export const config = loadConfig();

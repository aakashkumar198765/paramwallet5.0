import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-32-chars-long-minimum!',
      ENN_BASE_URL: 'https://keystore.test.local',
      ENN_APP_KEY: 'test-app-key',
      ENN_EXCHANGE_KEY: 'test-exchange-key',
      LOG_LEVEL: 'error',
      MONGOMS_SYSTEM_BINARY: '/home/lenovo/.cache/mongodb-binaries/mongod-x64-ubuntu-6.0.14',
      MONGOMS_VERSION: '6.0.14',
    },
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

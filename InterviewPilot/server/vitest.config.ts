import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    testTimeout: 90000,
    hookTimeout: 90000,
    env: {
      TEST_USE_SCHEMA_ISOLATION: 'true',
    },
  },
});

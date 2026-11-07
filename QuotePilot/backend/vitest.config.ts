import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false, // Run sequentially against real Atlas DB
    setupFiles: ['./src/tests/setup.ts'],
    hookTimeout: 60000,
    testTimeout: 60000,
  },
});

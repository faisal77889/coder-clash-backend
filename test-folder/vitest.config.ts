import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    testTimeout: 10000,
    // Optional: Enable coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
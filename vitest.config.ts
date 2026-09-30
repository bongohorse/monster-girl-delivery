import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./scripts/assets/AssetEntrypoints.ts'],
    coverage: {
      exclude: ['src/**/*.d.ts'],
      include: ['src/**/*.ts'],
      provider: 'istanbul',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      reportOnFailure: true,
    },
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

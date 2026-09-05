import { defineConfig } from 'vitest/config';
import baseConfig from '../../../vitest.config';

const base = baseConfig;

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      provider: 'v8',
      exclude: ['**/*.spec.ts'],
      include: [
        'src/domain/common/content-signing/signing.attempt.entity.ts',
        'src/domain/common/content-signing/signing.attempt.service.ts',
        'src/domain/common/content-signing/signing.attempt.status.ts',
        'src/migrations/1788609600000-CreateSigningAttempt.ts',
      ],
      reporter: ['text'],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 95,
        branches: 95,
      },
    },
  },
});

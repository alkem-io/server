import { defineConfig } from 'vitest/config';
import baseConfig from '../../../vitest.config';

const base = baseConfig;

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage-ci',
      exclude: ['**/*.spec.ts'],
      include: [
        'src/domain/common/content-signing/content.signing.module.ts',
        'src/domain/common/content-signing/signing.attempt.entity.ts',
        'src/domain/common/content-signing/signing.attempt.service.ts',
        'src/domain/common/content-signing/signing.attempt.status.ts',
        'src/domain/common/memo/memo.module.ts',
        'src/domain/common/memo/memo.service.ts',
        'src/domain/storage/storage-bucket/storage.bucket.module.ts',
        'src/domain/storage/storage-bucket/storage.bucket.service.ts',
        'src/migrations/1788609600000-CreateSigningAttempt.ts',
      ],
      reporter: ['text', 'json'],
      thresholds: {
        'src/domain/common/content-signing/**': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
        'src/migrations/1788609600000-CreateSigningAttempt.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
      },
    },
  },
});

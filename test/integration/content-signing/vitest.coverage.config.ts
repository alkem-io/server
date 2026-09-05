import { defineConfig } from 'vitest/config';
import baseConfig from '../../../vitest.config';

const base = baseConfig;

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage-ci/content-signing',
      exclude: ['**/*.spec.ts'],
      include: [
        'src/domain/common/content-signing/content.signing.module.ts',
        'src/domain/common/content-signing/signing.attempt.entity.ts',
        'src/domain/common/content-signing/signing.attempt.interface.ts',
        'src/domain/common/content-signing/signing.attempt.service.ts',
        'src/domain/common/content-signing/signing.attempt.status.ts',
        'src/domain/common/memo/dto/memo.signing.continue.input.ts',
        'src/domain/common/memo/dto/memo.signing.continue.result.ts',
        'src/domain/common/memo/dto/memo.signing.prepare.input.ts',
        'src/domain/common/memo/dto/memo.signing.prepare.result.ts',
        'src/domain/common/memo/memo.module.ts',
        'src/domain/common/memo/memo.pdf.renderer.ts',
        'src/domain/common/memo/memo.resolver.fields.ts',
        'src/domain/common/memo/memo.resolver.mutations.ts',
        'src/domain/common/memo/memo.signature.resolver.fields.ts',
        'src/services/api-rest/content-signing/*.ts',
        'src/domain/common/memo/memo.signing.service.ts',
        'src/domain/common/memo/memo.signing.sweep.service.ts',
        'src/common/enums/rest.endpoint.ts',
        'src/domain/common/memo/memo.service.ts',
        'src/domain/storage/storage-bucket/storage.bucket.module.ts',
        'src/domain/storage/storage-bucket/storage.bucket.service.ts',
        'src/migrations/1788609600000-CreateSigningAttempt.ts',
        'src/services/adapters/file-service-adapter/file.service.adapter.ts',
        'src/services/adapters/trust-gateway/trust.gateway.client.ts',
        'src/services/infrastructure/{kratos,url-generator}/*.service.ts',
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
        'src/domain/common/memo/memo.pdf.renderer.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
        'src/services/api-rest/content-signing/content.signing.controller.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
        'src/domain/common/memo/memo.signing.service.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
        'src/domain/common/memo/memo.signature.resolver.fields.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
        'src/domain/common/memo/memo.signing.sweep.service.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
        'src/services/adapters/trust-gateway/trust.gateway.client.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
        'src/services/api-rest/content-signing/content.signing.return.filter.ts':
          {
            lines: 95,
            statements: 95,
            functions: 95,
            branches: 95,
          },
      },
    },
  },
});

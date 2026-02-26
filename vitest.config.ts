import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// @ts-expect-error
const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    // SWC plugin for decorator metadata support (required for NestJS DI)
    swc.vite(),
    // Automatically resolve path aliases from tsconfig.json
    tsconfigPaths(),
  ],
  resolve: {
    // Resolve CJS dependencies that Vite has trouble with
    alias: {
      'cache-manager': resolve(
        dirname(require.resolve('cache-manager/package.json')),
        'dist/index.js'
      ),
      express: require.resolve('express'),
    },
    // Ensure single instance of graphql to avoid "Duplicate graphql modules" error
    dedupe: ['graphql'],
  },
  test: {
    // Use threads pool: workers share the process and module cache (with isolate: false),
    // giving better memory efficiency and clean process exit.
    pool: 'threads',
    // Match the number of workers to available CPU cores
    maxWorkers: 4,
    // Reuse module cache across tests - avoids re-importing per test file
    // Requires tests to not leak state (clearMocks: true handles mock call data)
    isolate: false,
    // Enable global test APIs (describe, it, expect, beforeEach, etc.)
    // This provides Jest-like API without explicit imports
    globals: true,

    // Test environment
    environment: 'node',

    // Test file patterns
    include: ['**/?(*.)+(spec).ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Automatically clear mock calls before every test
    clearMocks: true,

    // Test timeout (matching current Jest config: 90 seconds)
    testTimeout: 90000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      enabled: false, // Enable via CLI: vitest run --coverage
      reporter: [
        ['lcov', { subdir: 'lcov' }],
        ['html-spa', { subdir: 'html-spa' }],
      ],
      reportsDirectory: './coverage',

      // Measure all TS files in src/ — denylist approach for broad visibility
      include: ['src/**/*.ts'],

      // Exclude non-logic boilerplate and declarative files
      exclude: [
        // Test files
        '**/*.spec.ts',
        '**/*.e2e-spec.ts',
        '**/*.it-spec.ts',
        '**/node_modules/**',
        '**/dist/**',

        // Declarative / decorator-only files (no testable logic)
        'src/types/**',
        'src/**/*.entity.ts',
        'src/**/*.interface.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.dto.*.ts',
        'src/**/*.input.ts',
        'src/**/*.enum.ts',
        'src/**/*.type.ts',
        'src/**/*.types.ts',
        'src/**/*.constants.ts',
        'src/**/index.ts',

        'src/common/exceptions/**',
        'src/common/constants/**',
        'src/common/enums/**',

        // Infrastructure & config (tested by other harnesses or trivial)
        'src/migrations/**',
        'src/main.ts',
        'src/app.module.ts',
        'src/app.controller.ts',
        'src/config/**',
        'src/apm/**',
        'src/tools/**',
      ],

      // Coverage thresholds (matching current Jest config)
      thresholds: {
        'src/schema-contract/classify/': {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 85,
        },
        'src/schema-contract/diff/': {
          lines: 85,
          statements: 80,
          functions: 90,
          branches: 75,
        },
        'src/schema-contract/governance/': {
          lines: 75,
          statements: 70,
          functions: 65,
          branches: 60,
        },
        'src/schema-contract/deprecation/': {
          lines: 70,
          statements: 70,
          functions: 75,
          branches: 60,
        },
        'src/schema-contract/model/': {
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 100,
        },
        'src/schema-contract/snapshot/': {
          lines: 50,
          statements: 50,
          functions: 50,
          branches: 0,
        },
      },
    },
  },
});

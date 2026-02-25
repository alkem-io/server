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
    // Pool strategy: 'threads' for local dev (shared module cache, faster),
    // 'forks' for CI/constrained runners (independent processes, more resilient).
    // GitHub Actions sets CI=true automatically.
    pool: process.env.CI ? 'forks' : 'threads',
    // Vitest 4: pool options are now top-level (poolOptions was removed)
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
      reporter: ['text', 'lcov', 'json'],
      reportsDirectory: './coverage-ci',

      // Files to include in coverage (matching current Jest config)
      include: [
        'src/**/*.service.ts',
        'src/core/authentication/*.strategy.*',
        'src/core/authorization/*.guard.*',
        'src/core/middleware/*.*',
        'src/core/logging/logging.profiling.decorator.ts',
        'src/common/error-handling/http.exceptions.filter.ts',
        'src/schema-contract/**/*.ts',
        'src/schema-bootstrap/**/*.ts',
      ],

      // Files to exclude from coverage
      exclude: [
        '**/*.spec.ts',
        '**/*.e2e-spec.ts',
        '**/*.it-spec.ts',
        '**/node_modules/**',
        '**/dist/**',
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

# Research: Jest to Vitest Migration

**Feature**: 027-vitest-migration
**Date**: 2026-01-18

## Table of Contents

1. [NestJS + Vitest Integration](#1-nestjs--vitest-integration)
2. [Jest API Migration](#2-jest-api-migration)
3. [ModuleMocker Replacement](#3-modulemocker-replacement)
4. [Path Alias Configuration](#4-path-alias-configuration)
5. [Coverage Configuration](#5-coverage-configuration)
6. [Performance Expectations](#6-performance-expectations)
7. [Migration Strategy](#7-migration-strategy)

---

## 1. NestJS + Vitest Integration

### Decision
Use `unplugin-swc` as the transpiler instead of Vitest's default esbuild.

### Rationale
- NestJS relies heavily on decorator metadata (`emitDecoratorMetadata`) for dependency injection
- esbuild has partial decorator support but does NOT support `emitDecoratorMetadata`
- Without proper metadata emission, `@nestjs/testing`'s `Test.createTestingModule()` fails silently with services becoming `undefined`
- SWC is the only next-gen compiler supporting both `legacyDecorator` and `emitDecoratorMetadata`

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Default esbuild | Does not emit decorator metadata; breaks NestJS DI |
| Explicit `@Inject()` everywhere | Requires extensive code changes to production code |
| ts-jest style approach | No direct equivalent in Vitest ecosystem |

### Required Configuration

**Packages:**
```bash
pnpm add -D vitest @vitest/coverage-v8 unplugin-swc @swc/core vite-tsconfig-paths
```

**vitest.config.ts:**
```typescript
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite(),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts'],
    clearMocks: true,
    testTimeout: 90000,
  },
});
```

**.swcrc (required):**
```json
{
  "$schema": "https://json.schemastore.org/swcrc",
  "sourceMaps": true,
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    },
    "keepClassNames": true
  },
  "minify": false
}
```

---

## 2. Jest API Migration

### Decision
Use Vitest's `vi.*` API as direct replacements with `globals: true` enabled.

### Rationale
- Vitest was designed with Jest API compatibility as a primary goal
- The `vi` namespace mirrors Jest's `jest` namespace almost 1:1
- `globals: true` maintains Jest-like developer experience with no import changes needed

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Explicit imports | Requires modifying all 112 test files; can be done later |
| Keep Jest | Misses performance benefits; maintaining legacy tooling |

### API Mapping

| Jest | Vitest |
|------|--------|
| `jest.fn()` | `vi.fn()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` |
| `jest.restoreAllMocks()` | `vi.restoreAllMocks()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.requireActual()` | `await vi.importActual()` (async) |

### Behavioral Differences

1. **`mockReset` behavior**:
   - **Jest**: Replaces mock implementation with empty function returning `undefined`
   - **Vitest**: Resets to the *original* implementation

2. **Module mocking factory return**:
   ```typescript
   // Jest
   jest.mock('./module', () => 'hello')

   // Vitest - must explicitly define exports
   vi.mock('./module', () => ({ default: 'hello' }))
   ```

3. **Mock hoisting**: `vi.mock()` calls are hoisted to the top of the file before imports

---

## 3. ModuleMocker Replacement

### Decision
Replace `jest-mock` ModuleMocker with `@golevelup/ts-vitest` for NestJS auto-mocking.

### Rationale
- Vitest does not have a built-in `ModuleMocker` equivalent
- `@golevelup/ts-vitest` provides `createMock<T>()` that:
  - Works with NestJS's `useMocker()` method
  - Provides type-safe auto-mocking via TypeScript proxies
  - Is specifically designed for NestJS testing scenarios

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| `vitest-mock-extended` | Doesn't handle NestJS DI tokens well |
| Manual `vi.fn()` mocks | Tedious for large services with many methods |
| `vi.importMock` | Reimports manual mocks, doesn't create mocks from actual modules |

### Migration Pattern

**Before (Jest):**
```typescript
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
const moduleMocker = new ModuleMocker(global);

export const defaultMockerFactory = (token: InjectionToken | undefined) => {
  if (typeof token === 'function') {
    const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
    const Mock = moduleMocker.generateFromMetadata(mockMetadata);
    return new Mock();
  }
  // ...
};
```

**After (Vitest):**
```typescript
import { createMock } from '@golevelup/ts-vitest';

export const defaultMockerFactory = (token: InjectionToken | undefined) => {
  if (typeof token === 'function') {
    return createMock(token);
  }
  // ...
};
```

---

## 4. Path Alias Configuration

### Decision
Use `vite-tsconfig-paths` plugin to automatically resolve path aliases from `tsconfig.json`.

### Rationale
- Reads path mappings directly from `tsconfig.json` - no duplication needed
- Supports all TypeScript path alias features including `baseUrl`
- More maintainable than manual `resolve.alias` configuration

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Manual `resolve.alias` | Requires manual sync with tsconfig.json; error-prone |
| Duplicate path config | Violates DRY principle; maintenance burden |

### Implementation

The plugin automatically reads the existing `tsconfig.json` paths:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@interfaces/*": ["src/common/interfaces/*"],
      "@domain/*": ["src/domain/*"],
      "@common/*": ["src/common/*"],
      "@constants/*": ["src/common/constants/*"],
      "@core/*": ["src/core/*"],
      "@platform/*": ["src/platform/*"],
      "@config/*": ["src/config/*"],
      "@library/*": ["src/library/*"],
      "@services/*": ["src/services/*"],
      "@templates/*": ["src/platform/configuration/templates/*"],
      "@src/*": ["src/*"],
      "@test/*": ["test/*"]
    }
  }
}
```

No Vitest-specific alias configuration needed.

---

## 5. Coverage Configuration

### Decision
Use `@vitest/coverage-v8` with explicit `include` patterns and lcov reporter.

### Rationale
- v8 is faster than Istanbul and produces identical coverage reports since Vitest 3.2.0
- lcov format is standard for CI/CD tools (SonarQube, Coveralls, etc.)
- Explicit `include` patterns provide control over coverage scope

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| `@vitest/coverage-istanbul` | Slower; v8 now has feature parity |
| No coverage | CI requires coverage reporting |

### Configuration

```typescript
coverage: {
  provider: 'v8',
  enabled: true,
  reporter: ['text', 'lcov', 'json'],
  reportsDirectory: './coverage-ci',
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
  exclude: [
    '**/*.spec.ts',
    '**/*.e2e-spec.ts',
    '**/node_modules/**',
    '**/dist/**',
  ],
  thresholds: {
    'src/schema-contract/classify/': { lines: 90, statements: 90, functions: 90, branches: 85 },
    'src/schema-contract/diff/': { lines: 85, statements: 80, functions: 90, branches: 75 },
    'src/schema-contract/governance/': { lines: 75, statements: 70, functions: 65, branches: 60 },
    'src/schema-contract/deprecation/': { lines: 70, statements: 70, functions: 75, branches: 60 },
    'src/schema-contract/model/': { lines: 100, statements: 100, functions: 100, branches: 100 },
    'src/schema-contract/snapshot/': { lines: 50, statements: 50, functions: 50, branches: 0 },
  },
}
```

---

## 6. Performance Expectations

### Decision
Target ≥50% faster test execution (soft target per spec).

### Rationale
Based on industry benchmarks and architectural differences:

| Metric | Jest | Vitest | Expected Improvement |
|--------|------|--------|---------------------|
| Cold run speed | Baseline | Up to 4x faster | 50-75% reduction |
| Memory usage | Higher | ~33% lower | Noticeable |
| Watch mode | Full re-run | HMR-based (affected only) | Significantly faster |
| TypeScript | Via ts-jest | Native (SWC) | No transformer overhead |

### Key Performance Factors
1. **Architecture**: Vitest reuses Vite's dev server and ESM pipeline vs Jest's isolated Node.js environments
2. **HMR in Watch Mode**: Only reruns affected tests, not full suite
3. **Native TypeScript**: No ts-jest transformer overhead (using SWC instead)
4. **Parallelization**: More efficient worker pool management

### Caveats
- Performance gains vary by project structure
- First run may be slower due to cache warm-up
- The spec accepts any measurable improvement if 50% target not met

---

## 7. Migration Strategy

### Decision
Single atomic cutover (one PR) per spec requirements.

### Rationale
- Spec explicitly requires: "Single cutover in one PR; all tests migrate together"
- Avoids dual maintenance of Jest and Vitest configurations
- Rollback via git revert if issues discovered

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Gradual parallel migration | Spec requires single cutover |
| Test-by-test migration | Spec requires all tests migrate together |

### Execution Plan

**Step 1: Configuration Setup**
1. Create `vitest.config.ts` with all settings
2. Create `.swcrc` for decorator metadata
3. Add dev dependencies
4. Update `package.json` scripts

**Step 2: Automated API Migration**
Run codemod:
```bash
npx codemod jest/vitest -t "src/**/*.spec.ts" "test/**/*.spec.ts" "contract-tests/**/*.spec.ts"
```

Handles:
- `jest.*` → `vi.*` transformations
- Import statement updates

**Step 3: Manual Fixes**
1. Replace `ModuleMocker` usage in `test/utils/default.mocker.factory.ts`
2. Update mock factory patterns
3. Fix any module mocking factory returns

**Step 4: Cleanup**
1. Remove Jest dependencies: `jest`, `jest-mock`, `ts-jest`, `@types/jest`
2. Delete `test/config/jest.config*.js` files
3. Remove Jest-related tsconfig types

**Step 5: Validation**
1. Run full test suite: `pnpm test:ci`
2. Verify coverage output at `coverage-ci/lcov.info`
3. Measure performance improvement

---

## Appendix: Files Requiring Manual Attention

| File | Reason |
|------|--------|
| `test/utils/default.mocker.factory.ts` | Uses `ModuleMocker` from `jest-mock` |
| `test/utils/repository.mock.factory.ts` | May use Jest-specific APIs |
| `package.json` | Script and dependency updates |
| Any file with `jest.requireActual()` | Needs async conversion to `vi.importActual()` |

---

## Sources

- [Switching from Jest to Vitest in NestJS](https://blog.ablo.ai/jest-to-vitest-in-nestjs)
- [TrilonIO/nest-vitest Example](https://github.com/TrilonIO/nest-vitest)
- [Vitest Migration Guide](https://vitest.dev/guide/migration.html)
- [Vitest Coverage Configuration](https://vitest.dev/config/coverage)
- [@golevelup/ts-vitest](https://www.npmjs.com/package/@golevelup/ts-vitest)
- [unplugin-swc](https://github.com/unplugin/unplugin-swc)
- [vite-tsconfig-paths](https://www.npmjs.com/package/vite-tsconfig-paths)
- [NestJS SWC Recipe](https://docs.nestjs.com/recipes/swc)

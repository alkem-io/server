# Quickstart: Jest to Vitest Migration

**Feature**: 027-vitest-migration
**Date**: 2026-01-18

## Prerequisites

- Node.js 22+ (Volta pins 22.21.1)
- pnpm 10.17.1+
- Existing Alkemio Server codebase

## Quick Migration Steps

### 1. Install Dependencies

```bash
# Add Vitest and related packages
pnpm add -D vitest @vitest/coverage-v8 unplugin-swc @swc/core vite-tsconfig-paths @golevelup/ts-vitest

# Remove Jest packages
pnpm remove jest jest-mock ts-jest @types/jest
```

### 2. Create Configuration Files

**Create `vitest.config.ts` in repository root:**

```bash
cp specs/027-vitest-migration/contracts/vitest.config.ts.template vitest.config.ts
```

**Create `.swcrc` in repository root:**

```bash
cp specs/027-vitest-migration/contracts/.swcrc.template .swcrc
```

### 3. Update package.json Scripts

Replace the test scripts in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "test:debug": "vitest --inspect-brk",
    "test:ci": "vitest run --coverage && cat ./coverage-ci/lcov.info",
    "test:ci:no:coverage": "vitest run"
  }
}
```

### 4. Run Automated Migration

```bash
# Run the Jest to Vitest codemod
npx codemod jest/vitest -t "src/**/*.spec.ts" "test/**/*.spec.ts" "contract-tests/**/*.spec.ts"
```

### 5. Manual Fixes

Update `test/utils/default.mocker.factory.ts`:

- Replace `ModuleMocker` import with `createMock` from `@golevelup/ts-vitest`
- Replace `jest.fn()` with `vi.fn()`

See `contracts/default.mocker.factory.ts.template` for reference implementation.

### 6. Update TypeScript Config

Add Vitest types to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

### 7. Remove Old Config Files

```bash
rm test/config/jest.config.js
rm test/config/jest.config.ci.js
rm test/config/jest.config.ci.nocov.js
```

### 8. Verify Migration

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:ci

# Verify coverage output exists
ls -la coverage-ci/lcov.info
```

## Commands Reference

| Command                        | Description                         |
| ------------------------------ | ----------------------------------- |
| `pnpm test`                    | Run all tests once                  |
| `pnpm test:watch`              | Run tests in watch mode             |
| `pnpm test:cov`                | Run tests with coverage             |
| `pnpm test:ci`                 | CI mode with coverage + lcov output |
| `pnpm test:ci:no:coverage`     | CI mode without coverage            |
| `pnpm test -- path/to/spec.ts` | Run specific test file              |

## Troubleshooting

### Tests fail with "Cannot read properties of undefined"

**Cause**: SWC not emitting decorator metadata.

**Solution**: Ensure `.swcrc` exists with:

```json
{
  "jsc": {
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    }
  }
}
```

### Path aliases not resolving

**Cause**: `vite-tsconfig-paths` plugin not configured.

**Solution**: Ensure `vitest.config.ts` includes:

```typescript
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
});
```

### Coverage not generated

**Cause**: Coverage not enabled by default.

**Solution**: Use `--coverage` flag or set `coverage.enabled: true` in config.

### Mock not working as expected

**Cause**: Vitest `mockReset` behavior differs from Jest.

**Solution**: Use `vi.restoreAllMocks()` if you need Jest's `mockReset` behavior.

## Performance Measurement

Record baseline before migration:

```bash
# Time the current Jest run
time pnpm test:ci:no:coverage
```

Compare after migration:

```bash
# Time the Vitest run
time pnpm test:ci:no:coverage
```

Target: ≥50% improvement (soft target; any measurable improvement acceptable).

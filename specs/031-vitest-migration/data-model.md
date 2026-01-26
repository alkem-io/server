# Data Model: Jest to Vitest Migration

**Feature**: 031-vitest-migration
**Date**: 2026-01-18

## Overview

This migration affects test infrastructure configuration only. No database entities or domain models are changed. This document describes the configuration structures and file transformations involved.

---

## Configuration Entities

### 1. Vitest Configuration (`vitest.config.ts`)

**Purpose**: Central test runner configuration replacing Jest config files.

| Field | Type | Description |
|-------|------|-------------|
| `plugins` | Plugin[] | Vite plugins (swc, tsconfigPaths) |
| `test.globals` | boolean | Enable global test APIs (describe, it, expect) |
| `test.environment` | string | Test environment ('node') |
| `test.include` | string[] | Test file patterns |
| `test.exclude` | string[] | Excluded patterns |
| `test.clearMocks` | boolean | Clear mock state before each test |
| `test.testTimeout` | number | Default test timeout in ms |
| `test.coverage` | CoverageOptions | Coverage configuration |

### 2. SWC Configuration (`.swcrc`)

**Purpose**: TypeScript compilation with decorator metadata support.

| Field | Type | Description |
|-------|------|-------------|
| `sourceMaps` | boolean | Enable source maps |
| `jsc.parser.syntax` | string | Parser syntax ('typescript') |
| `jsc.parser.decorators` | boolean | Enable decorator parsing |
| `jsc.transform.legacyDecorator` | boolean | Legacy decorator transform |
| `jsc.transform.decoratorMetadata` | boolean | Emit decorator metadata |
| `jsc.keepClassNames` | boolean | Preserve class names for DI |

### 3. Coverage Options

**Purpose**: Configure code coverage collection and reporting.

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Coverage provider ('v8') |
| `enabled` | boolean | Enable coverage collection |
| `reporter` | string[] | Output formats ['text', 'lcov', 'json'] |
| `reportsDirectory` | string | Output directory ('./coverage-ci') |
| `include` | string[] | Files to include in coverage |
| `exclude` | string[] | Files to exclude from coverage |
| `thresholds` | Record<string, Threshold> | Per-path coverage thresholds |

### 4. Threshold Configuration

**Purpose**: Define minimum coverage requirements per directory.

| Field | Type | Description |
|-------|------|-------------|
| `lines` | number | Minimum line coverage % |
| `statements` | number | Minimum statement coverage % |
| `functions` | number | Minimum function coverage % |
| `branches` | number | Minimum branch coverage % |

---

## File Transformations

### 1. Test Files (`*.spec.ts`)

**Transformation**: Replace Jest globals with Vitest equivalents.

| Before | After |
|--------|-------|
| `jest.fn()` | `vi.fn()` |
| `jest.spyOn(obj, 'method')` | `vi.spyOn(obj, 'method')` |
| `jest.mock('./path')` | `vi.mock('./path')` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` |
| `jest.restoreAllMocks()` | `vi.restoreAllMocks()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.useRealTimers()` | `vi.useRealTimers()` |
| `jest.requireActual('./path')` | `await vi.importActual('./path')` |

**Files affected**: 112 total
- `src/**/*.spec.ts`: 76 files
- `test/**/*.spec.ts`: 30 files
- `contract-tests/**/*.spec.ts`: 6 files

### 2. Mock Utilities (`test/utils/`)

**Transformation**: Replace `jest-mock` with Vitest/golevelup equivalents.

| File | Before | After |
|------|--------|-------|
| `default.mocker.factory.ts` | `ModuleMocker` from `jest-mock` | `createMock` from `@golevelup/ts-vitest` |
| `repository.mock.factory.ts` | `jest.fn()` | `vi.fn()` |
| `event-bus.mock.factory.ts` | `jest.fn()` | `vi.fn()` |
| `pub.sub.engine.mock.factory.ts` | `jest.fn()` | `vi.fn()` |

### 3. Mock Providers (`test/mocks/`)

**Transformation**: Replace `jest.fn()` with `vi.fn()` in mock implementations.

**Files affected**: ~38 files in `test/mocks/`

---

## Package Dependencies

### Dependencies to Add

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^3.0.0 | Test runner |
| `@vitest/coverage-v8` | ^3.0.0 | Coverage provider |
| `unplugin-swc` | ^1.5.0 | SWC integration for Vite |
| `@swc/core` | ^1.7.0 | SWC compiler |
| `vite-tsconfig-paths` | ^5.0.0 | Path alias resolution |
| `@golevelup/ts-vitest` | ^0.5.0 | NestJS mock utilities |

### Dependencies to Remove

| Package | Reason |
|---------|--------|
| `jest` | Replaced by vitest |
| `jest-mock` | Replaced by @golevelup/ts-vitest |
| `ts-jest` | Replaced by unplugin-swc |
| `@types/jest` | Replaced by vitest/globals types |

---

## NPM Scripts Mapping

| Current Script | New Script | Command Change |
|----------------|------------|----------------|
| `test` | `test` | `jest --config ./test/config/jest.config.js` → `vitest run` |
| `test:watch` | `test:watch` | `jest --watch ...` → `vitest` |
| `test:cov` | `test:cov` | `jest --coverage ...` → `vitest run --coverage` |
| `test:ci` | `test:ci` | `jest --forceExit --config ./test/config/jest.config.ci.js && cat ./coverage-ci/lcov.info` → `vitest run --coverage && cat ./coverage-ci/lcov.info` |
| `test:ci:no:coverage` | `test:ci:no:coverage` | `jest --forceExit --config ./test/config/jest.config.ci.nocov.js` → `vitest run` |
| `test:debug` | `test:debug` | `node --inspect-brk ... jest --runInBand` → `vitest --inspect-brk` |

---

## Files to Create

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Main Vitest configuration |
| `.swcrc` | SWC compiler configuration |

## Files to Remove

| File | Reason |
|------|--------|
| `test/config/jest.config.js` | Replaced by vitest.config.ts |
| `test/config/jest.config.ci.js` | Merged into vitest.config.ts |
| `test/config/jest.config.ci.nocov.js` | Merged into vitest.config.ts |

---

## Validation Rules

### Test Execution
- All 112 test files must pass without test logic changes
- Test output must be clear and actionable

### Coverage
- lcov output must be generated at `coverage-ci/lcov.info`
- Per-directory thresholds must be enforced (matching current Jest config)

### Performance
- Test suite should complete ≥50% faster (soft target)
- Watch mode should provide near-instant feedback

### Compatibility
- All `pnpm test*` commands must work without change to command names
- TypeScript path aliases must resolve correctly

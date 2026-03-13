# Implementation Plan: Unit Test Coverage for src/config

**Created**: 2026-03-12
**Status**: Complete

## Overview

Add unit tests for the `src/config` directory to achieve >=80% line coverage. The config area contains 16 TypeScript files, of which 5 contain testable business logic.

## Phases

### Phase 1: Enable Coverage Measurement
- Remove `src/config/**` from `vitest.config.ts` coverage.exclude array

### Phase 2: Implement Tests
- `config.utils.spec.ts` - Test `parseHMSString` with various duration formats
- `configuration.spec.ts` - Test YAML loading, env var substitution, type coercion
- `fix.uuid.column.type.spec.ts` - Test UUID column type normalization
- `winston.config.spec.ts` - Test Winston transport creation

### Phase 3: Verify
- Run tests with coverage
- Fix any failures
- Verify lint and typecheck pass

## Files NOT Tested (by exclusion convention)
- `index.ts` files (barrel exports)
- `graphql/*.ts` (GraphQL query constants - declarative)
- `migration.config.ts`, `migration.create.config.ts` (side-effect-heavy DataSource init)
- `typeorm.cli.config.ts`, `typeorm.cli.config.run.ts` (config objects read at module load)
- `dynamic.import.ts` (single-line wrapper, untestable via unit test)
- `aliases.ts` (module-alias side effects at import time)

## Risk Assessment
- Low risk: all changes are additive (new test files + one config line removal)

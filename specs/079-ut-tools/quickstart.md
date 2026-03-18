# Unit Tests for src/tools -- Quickstart

## Running tests

```bash
# Run all tools tests
pnpm vitest run src/tools

# Run with coverage
pnpm vitest run --coverage src/tools

# Run specific file
pnpm vitest run src/tools/schema/deprecation-parser.spec.ts
```

## Prerequisites

- `pnpm install` completed
- No external services needed (pure unit tests)

## Configuration change

The `src/tools/**` exclusion must be removed from `vitest.config.ts` `coverage.exclude` array to enable coverage measurement.

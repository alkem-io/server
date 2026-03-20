# Quickstart: Running src/apm Tests

**Created**: 2026-03-12

## Run Tests

```bash
# Run all APM tests
pnpm vitest run src/apm

# Run with coverage
pnpm vitest run --coverage src/apm

# Run a specific test file
pnpm vitest run src/apm/decorators/util/copy.metadata.spec.ts
```

## Verify Quality

```bash
# Lint check
pnpm lint

# Type check
pnpm exec tsc --noEmit
```

## Coverage Target

>=80% line coverage for `src/apm/**/*.ts` (excluding index.ts and type files).

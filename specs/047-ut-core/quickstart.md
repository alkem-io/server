# Quickstart: Unit Tests for src/core

## Run Tests
```bash
# Run all core tests
pnpm vitest run src/core

# Run with coverage
pnpm vitest run --coverage src/core

# Run specific test file
pnpm vitest run src/core/validation/subdomain.regex.spec.ts
```

## Verify Quality
```bash
# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## Test File Locations
All test files are co-located with their source files:
- `src/core/<module>/<file>.ts` -> `src/core/<module>/<file>.spec.ts`

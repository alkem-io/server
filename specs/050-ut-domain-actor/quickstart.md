# Quickstart: Running Actor Domain Tests

**Created**: 2026-03-12

## Run Tests

```bash
# Run all actor domain tests
pnpm vitest run src/domain/actor

# Run with coverage
pnpm vitest run --coverage src/domain/actor

# Run a specific test file
pnpm vitest run src/domain/actor/actor/actor.service.spec.ts

# Run in watch mode (development)
pnpm vitest src/domain/actor
```

## Verify Quality

```bash
# Lint check
pnpm lint

# TypeScript check
pnpm exec tsc --noEmit
```

## Test File Locations

All tests are co-located with source files:

- `src/domain/actor/actor/actor.service.spec.ts`
- `src/domain/actor/actor/actor.service.authorization.spec.ts`
- `src/domain/actor/actor/actor.resolver.mutations.spec.ts`
- `src/domain/actor/actor/actor.resolver.queries.spec.ts`
- `src/domain/actor/actor/actor.resolver.fields.spec.ts`
- `src/domain/actor/actor/actor.full.resolver.fields.spec.ts`
- `src/domain/actor/actor-lookup/actor.lookup.service.spec.ts`
- `src/domain/actor/actor-lookup/actor.lookup.service.cache.spec.ts`
- `src/domain/actor/credential/credential.service.spec.ts`
- `src/domain/actor/credential/credential.resolver.fields.spec.ts`

# Quickstart: Unit Tests for src/domain/community

## Prerequisites
- Node.js 22 LTS
- pnpm 10.17.1

## Run Tests

```bash
# Run all community domain tests
npx vitest run src/domain/community

# Run with coverage
npx vitest run --coverage src/domain/community

# Run a specific test file
npx vitest run src/domain/community/user-identity/user.identity.service.spec.ts

# Watch mode for development
npx vitest src/domain/community
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
- `src/domain/community/<module>/<name>.spec.ts`

## Adding a New Test

Follow the pattern:
1. Create `<name>.spec.ts` next to the source file
2. Import NestJS Test module, MockWinstonProvider, MockCacheManager, defaultMockerFactory
3. If the class injects a TypeORM repository, add `repositoryProviderMockFactory(Entity)`
4. Use `.useMocker(defaultMockerFactory)` to auto-mock remaining dependencies
5. Write `it('should be defined')` first to confirm wiring
6. Add substantive tests for business logic

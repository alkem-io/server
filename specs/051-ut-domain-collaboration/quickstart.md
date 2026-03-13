# Quickstart: Unit Tests for `src/domain/collaboration`

## Run Tests

```bash
# Run only collaboration tests
pnpm test -- src/domain/collaboration

# Run with coverage
pnpm test -- --coverage src/domain/collaboration

# Run a specific test file
pnpm test -- src/domain/collaboration/innovation-flow-state/innovation.flow.state.service.authorization.spec.ts
```

## Verify Quality

```bash
pnpm lint          # TypeScript + Biome checks
pnpm exec tsc --noEmit  # Type checking only
```

## Test Conventions

- Co-locate `.spec.ts` next to source file
- Use `describe('ClassName')` > `describe('methodName')` > `it('should ...')`
- Mock via `defaultMockerFactory` + explicit providers for repositories/cache/logger
- Test happy path, error paths, and conditional branches

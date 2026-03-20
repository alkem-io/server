# Quickstart: Unit Tests for `src/services/whiteboard-integration`

## Run Tests

```bash
# Run whiteboard-integration tests only
pnpm vitest run src/services/whiteboard-integration

# Run with coverage
pnpm vitest run --coverage src/services/whiteboard-integration

# Run specific test file
pnpm vitest run src/services/whiteboard-integration/whiteboard.integration.service.spec.ts
pnpm vitest run src/services/whiteboard-integration/whiteboard.integration.controller.spec.ts
```

## Verify

```bash
pnpm lint
pnpm exec tsc --noEmit
```

## Test Files

- `src/services/whiteboard-integration/whiteboard.integration.service.spec.ts` (extended)
- `src/services/whiteboard-integration/whiteboard.integration.controller.spec.ts` (new)

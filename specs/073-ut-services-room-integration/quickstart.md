# Quickstart: Unit Tests for `src/services/room-integration`

## Run Tests

```bash
npx vitest run --coverage --coverage.include='src/services/room-integration/**' src/services/room-integration
```

## Verify Lint

```bash
pnpm lint
```

## Verify Types

```bash
pnpm exec tsc --noEmit
```

## File Locations

- Source: `src/services/room-integration/room.controller.service.ts`
- Tests: `src/services/room-integration/room.controller.service.spec.ts`

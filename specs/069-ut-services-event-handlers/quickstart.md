# Quickstart: Unit Tests for `src/services/event-handlers`

## Run Tests

```bash
# Run all event-handler tests
npx vitest run src/services/event-handlers

# Run with coverage
npx vitest run --coverage --coverage.include='src/services/event-handlers/**/*.ts' --coverage.reporter=text src/services/event-handlers

# Run specific test file
npx vitest run src/services/event-handlers/internal/message-inbox/message.inbox.service.spec.ts
```

## Lint

```bash
pnpm lint
```

## Type Check

```bash
pnpm exec tsc --noEmit
```

## Files Modified

- `src/services/event-handlers/internal/message-inbox/message.inbox.service.spec.ts`
- `src/services/event-handlers/internal/message-inbox/message.notification.service.spec.ts`
- `src/services/event-handlers/internal/message-inbox/vc.invocation.service.spec.ts`

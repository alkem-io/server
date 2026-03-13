# Quickstart: Unit Tests for `src/domain/activity-feed`

## Run Tests

```bash
# Run activity-feed tests only
pnpm vitest run src/domain/activity-feed

# Run with coverage
pnpm vitest run --coverage src/domain/activity-feed

# Run specific test file
pnpm vitest run src/domain/activity-feed/activity.feed.service.spec.ts
pnpm vitest run src/domain/activity-feed/activity.feed.resolver.queries.spec.ts
```

## Verify Quality

```bash
pnpm lint
pnpm exec tsc --noEmit
```

## Test Files

- `src/domain/activity-feed/activity.feed.service.spec.ts` - Extended service tests
- `src/domain/activity-feed/activity.feed.resolver.queries.spec.ts` - New resolver tests

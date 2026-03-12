# Quickstart: Unit Tests for src/services/api-rest

## Run Tests

```bash
# Run all api-rest tests
pnpm vitest run src/services/api-rest

# Run with coverage
pnpm vitest run --coverage src/services/api-rest

# Run a specific test file
pnpm vitest run src/services/api-rest/calendar-event-ics/calendar-event-ics.controller.spec.ts
```

## Verify

```bash
# Type checking
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## Test Files

| Test File | Source File |
|-----------|------------|
| `calendar-event-ics.controller.spec.ts` | `calendar-event-ics.controller.ts` |
| `calendar-event-ics.service.spec.ts` | `calendar-event-ics.service.ts` |
| `calendar-event-ics.redirect.filter.spec.ts` | `calendar-event-ics.redirect.filter.ts` |
| `identity-resolve.controller.spec.ts` | `identity-resolve.controller.ts` |
| `identity-resolve.service.spec.ts` | `identity-resolve.service.ts` |

# Quickstart: Unit Tests for `src/services/auth-reset`

## Run the tests

```bash
# Run auth-reset tests only
pnpm vitest run src/services/auth-reset

# Run with coverage
pnpm vitest run --coverage src/services/auth-reset

# Run in watch mode during development
pnpm vitest src/services/auth-reset
```

## Verify quality

```bash
# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## Files created/modified

| File | Action |
|------|--------|
| `src/services/auth-reset/publisher/auth-reset.service.spec.ts` | Replaced skeleton with full tests |
| `src/services/auth-reset/subscriber/auth-reset.controller.spec.ts` | Replaced skeleton with full tests |
| `test/mocks/task.service.mock.ts` | Added missing `updateTaskResults` method |

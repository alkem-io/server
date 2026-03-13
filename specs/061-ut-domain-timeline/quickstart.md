# Quickstart: Unit Tests for src/domain/timeline

## Run all timeline tests
```bash
npx vitest run src/domain/timeline
```

## Run with coverage
```bash
npx vitest run --coverage --coverage.reporter=text src/domain/timeline
```

## Run a single test file
```bash
npx vitest run src/domain/timeline/calendar/calendar.service.authorization.spec.ts
```

## Verify lint
```bash
pnpm lint
```

## Verify types
```bash
pnpm exec tsc --noEmit
```

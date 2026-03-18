# Quickstart

## Run the infrastructure tests
```bash
npx vitest run src/services/infrastructure
```

## Run with coverage
```bash
npx vitest run --coverage --coverage.reporter=text src/services/infrastructure
```

## Run a single test file
```bash
npx vitest run src/services/infrastructure/event-bus/handlers/invoke.engine.result.handler.spec.ts
```

## Lint check
```bash
pnpm lint
```

## Type check
```bash
pnpm exec tsc --noEmit
```

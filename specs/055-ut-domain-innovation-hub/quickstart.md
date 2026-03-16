# Quickstart: Running Innovation Hub Unit Tests

## Run all innovation-hub tests
```bash
npx vitest run src/domain/innovation-hub
```

## Run with coverage
```bash
npx vitest run --coverage --coverage.reporter=text src/domain/innovation-hub
```

## Run a specific test file
```bash
npx vitest run src/domain/innovation-hub/innovation.hub.service.authorization.spec.ts
```

## Lint check
```bash
pnpm lint
```

## Type check
```bash
pnpm exec tsc --noEmit
```

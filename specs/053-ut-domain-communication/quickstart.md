# Quickstart: Running Communication Unit Tests

## Run all communication tests
```bash
npx vitest run src/domain/communication
```

## Run with coverage
```bash
npx vitest run --coverage.enabled --coverage.reporter=text --coverage.include='src/domain/communication/**' src/domain/communication
```

## Run a specific test file
```bash
npx vitest run src/domain/communication/room/room.service.authorization.spec.ts
```

## Lint check
```bash
pnpm lint
```

## Type check
```bash
pnpm exec tsc --noEmit
```

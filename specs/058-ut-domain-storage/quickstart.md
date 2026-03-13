# Quickstart: Running Storage Domain Tests

## Run all storage domain tests
```bash
pnpm vitest run src/domain/storage
```

## Run with coverage
```bash
pnpm vitest run --coverage src/domain/storage
```

## Run a specific test file
```bash
pnpm vitest run src/domain/storage/document/document.service.authorization.spec.ts
```

## Lint check
```bash
pnpm lint
```

## Type check
```bash
pnpm exec tsc --noEmit
```

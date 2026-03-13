# Quickstart: Running src/library Tests

## Run all library tests
```bash
npx vitest run src/library
```

## Run with coverage
```bash
npx vitest run --coverage src/library
```

## Run a specific test file
```bash
npx vitest run src/library/innovation-pack/innovation.pack.service.spec.ts
```

## Lint check
```bash
pnpm lint
```

## Type check
```bash
pnpm exec tsc --noEmit
```

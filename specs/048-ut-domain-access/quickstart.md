# Quickstart: Running domain/access Unit Tests

## Run all tests
```bash
npx vitest run src/domain/access
```

## Run with coverage
```bash
npx vitest run --coverage.enabled --coverage.reporter=text --coverage.include='src/domain/access/**' src/domain/access
```

## Run a specific test file
```bash
npx vitest run src/domain/access/role-set/role.set.service.spec.ts
```

## Lint check
```bash
pnpm lint
```

## Type check
```bash
pnpm exec tsc --noEmit
```

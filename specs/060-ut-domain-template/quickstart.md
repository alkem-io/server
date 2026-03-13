# Quickstart: Running Template Domain Tests

## Run all template tests
```bash
npx vitest run src/domain/template
```

## Run with coverage
```bash
npx vitest run --coverage --coverage.reporter=text --coverage.include='src/domain/template/**/*.ts' src/domain/template
```

## Run a specific test file
```bash
npx vitest run src/domain/template/template/template.service.authorization.spec.ts
```

## Verify types compile
```bash
pnpm exec tsc --noEmit
```

## Lint
```bash
pnpm lint
```

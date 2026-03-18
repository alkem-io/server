# Quickstart: Running Subscription Tests

## Run Tests

```bash
npx vitest run src/services/subscriptions
```

## Run Tests with Coverage

```bash
npx vitest run --coverage.enabled --coverage.reporter=text --coverage.include='src/services/subscriptions/**' src/services/subscriptions
```

## Lint Check

```bash
pnpm lint
```

## Type Check

```bash
pnpm exec tsc --noEmit
```

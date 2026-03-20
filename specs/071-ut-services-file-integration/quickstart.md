# Quickstart: Running file-integration tests

## Run tests with coverage

```bash
pnpm vitest run --coverage src/services/file-integration
```

## Run tests without coverage

```bash
pnpm vitest run src/services/file-integration
```

## Run a specific test file

```bash
pnpm vitest run src/services/file-integration/file.integration.controller.spec.ts
pnpm vitest run src/services/file-integration/file.integration.service.spec.ts
```

## Lint check

```bash
pnpm lint
```

## Type check

```bash
pnpm exec tsc --noEmit
```

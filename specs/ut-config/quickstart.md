# Quickstart: Running src/config Tests

**Created**: 2026-03-12

## Run All Config Tests

```bash
pnpm vitest run src/config
```

## Run With Coverage

```bash
pnpm vitest run --coverage src/config
```

Coverage output will be in `coverage-ci/`.

## Run a Specific Test File

```bash
pnpm vitest run src/config/config.utils.spec.ts
pnpm vitest run src/config/configuration.spec.ts
pnpm vitest run src/config/fix.uuid.column.type.spec.ts
pnpm vitest run src/config/winston.config.spec.ts
```

## Verify No Regressions

```bash
pnpm lint
pnpm exec tsc --noEmit
```

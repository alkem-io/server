# Quickstart: profile-documents Unit Tests

## Run Tests

```bash
npx vitest run src/domain/profile-documents
```

## Run Tests with Coverage

```bash
npx vitest run --coverage --coverage.reporter=text --coverage.include='src/domain/profile-documents/**' src/domain/profile-documents
```

## Lint and Type Check

```bash
pnpm lint
pnpm exec tsc --noEmit
```

## Test File Location

`src/domain/profile-documents/profile.documents.service.spec.ts`

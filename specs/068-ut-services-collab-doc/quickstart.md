# Quickstart: Running collaborative-document-integration Tests

## Run Tests
```bash
# Run all tests in the area with coverage
pnpm vitest run --coverage src/services/collaborative-document-integration

# Run a specific test file
pnpm vitest run src/services/collaborative-document-integration/collaborative-document-integration.controller.spec.ts
```

## Verify Quality
```bash
pnpm lint
pnpm exec tsc --noEmit
```

## Test Files
- `collaborative-document-integration.service.spec.ts` (pre-existing, 14 tests)
- `collaborative-document-integration.controller.spec.ts` (new, 6 tests)
- `outputs/fetch.output.data.spec.ts` (new, 2 tests)
- `outputs/save.output.data.spec.ts` (new, 2 tests)

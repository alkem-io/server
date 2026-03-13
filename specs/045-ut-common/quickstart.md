# Quickstart: Unit Tests for src/common

## Prerequisites
- Node.js 22 LTS
- pnpm 10.17.1

## Run Tests
```bash
# Install dependencies
pnpm install

# Run tests for src/common with coverage
npx vitest run --coverage src/common

# Run a specific test file
npx vitest run src/common/pipes/validation.pipe.spec.ts

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## Test File Locations
All test files are co-located with their source files:
- `src/common/app.id.provider.spec.ts`
- `src/common/decorators/authorizationActorHasPrivilege.spec.ts`
- `src/common/decorators/profiling.decorator.spec.ts`
- `src/common/decorators/typed.subscription/typed.subscription.decorator.spec.ts`
- `src/common/interceptors/innovation.hub.interceptor.spec.ts`
- `src/common/pipes/validation.pipe.spec.ts`

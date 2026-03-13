# Plan: Unit Tests for src/common

## Phase 1: Analysis (Complete)
- Identified 10 untestable files (interfaces, types, options)
- Identified 7 files needing new tests
- 25 utils already have tests

## Phase 2: Test Implementation

### Task 1: app.id.provider.spec.ts
- Verify APP_ID_VALUE is a valid UUID
- Verify APP_ID_PROVIDER has correct shape (provide token, useValue)

### Task 2: authorizationActorHasPrivilege.spec.ts
- Verify SetMetadata is called with 'privilege' key and provided value

### Task 3: profiling.decorator.spec.ts
- Test _log method formatting
- Test api decorator with sync, async, and function return values
- Test early return when logger not available

### Task 4: typed.subscription.decorator.spec.ts
- Verify it delegates to @nestjs/graphql Subscription

### Task 5: innovation.hub.interceptor.spec.ts
- Test non-graphql context bypass
- Test missing headers bypass
- Test missing host header bypass
- Test whitelisted subdomain bypass
- Test successful innovation hub injection
- Test error handling when hub not found

### Task 6: validation.pipe.spec.ts
- Test passthrough for primitive types (String, Boolean, Number, Array, Object)
- Test passthrough for missing metatype
- Test validation delegation for custom DTOs

## Phase 3: Verification
- Run `npx vitest run --coverage src/common`
- Run `pnpm lint`
- Run `pnpm exec tsc --noEmit`

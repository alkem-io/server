# Requirements Checklist

## Coverage Target
- [ ] src/common overall coverage >= 80% (statements)

## Test Quality
- [x] Tests co-located with source files
- [x] Vitest 4.x with globals enabled
- [x] External dependencies mocked
- [x] Business logic tested (not framework internals)
- [x] Exception messages do not contain dynamic data
- [x] No new production code changes

## Files Covered
- [ ] app.id.provider.ts
- [ ] authorizationActorHasPrivilege.ts
- [ ] profiling.decorator.ts
- [ ] typed.subscription.decorator.ts
- [ ] innovation.hub.interceptor.ts
- [ ] validation.pipe.ts

## Verification
- [ ] `npx vitest run --coverage src/common` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm exec tsc --noEmit` passes

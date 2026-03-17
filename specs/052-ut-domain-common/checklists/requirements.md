# Requirements Checklist

## Coverage Target
- [ ] >=80% statement coverage for src/domain/common

## Test Quality
- [ ] Each test file uses NestJS Test module for DI
- [ ] Each test file uses MockWinstonProvider for logging
- [ ] Each test file uses MockCacheManager for caching
- [ ] Each test file uses defaultMockerFactory for auto-mocking
- [ ] Each test file uses repositoryProviderMockFactory where entity repositories are needed
- [ ] Tests cover happy paths (valid inputs, expected behavior)
- [ ] Tests cover error paths (missing relations, invalid state)
- [ ] Tests verify correct method calls on dependencies
- [ ] No dynamic data in exception messages (structured details only)

## Files to Create
- [ ] nvp.factory.spec.ts
- [ ] profile.avatar.service.spec.ts
- [ ] license.service.authorization.spec.ts
- [ ] visual.service.authorization.spec.ts
- [ ] classification.service.authorization.spec.ts
- [ ] media.gallery.service.authorization.spec.ts
- [ ] memo.service.authorization.spec.ts
- [ ] profile.service.authorization.spec.ts
- [ ] knowledge.base.service.authorization.spec.ts
- [ ] whiteboard.service.authorization.spec.ts

## Verification
- [ ] All tests pass: `pnpm test src/domain/common`
- [ ] Lint passes: `pnpm lint`
- [ ] Type check passes: `pnpm exec tsc --noEmit`

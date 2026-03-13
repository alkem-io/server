# Requirements Checklist: Unit Tests for src/core

## Coverage Requirements
- [ ] >= 80% statement coverage for `src/core`
- [ ] All new tests pass
- [ ] No regression in existing tests

## Code Quality
- [ ] All tests co-located with source as `*.spec.ts`
- [ ] Vitest 4.x globals used (describe, it, expect, vi)
- [ ] NestJS Test module used for injectable services
- [ ] MockWinstonProvider used for logger mocking
- [ ] MockCacheManager used for cache mocking
- [ ] defaultMockerFactory used for auto-mocking
- [ ] No lint errors (Biome)
- [ ] No TypeScript errors (tsc --noEmit)

## Test Quality
- [ ] Tests cover happy paths
- [ ] Tests cover error/edge cases
- [ ] Tests verify exception types and messages
- [ ] Tests use descriptive names
- [ ] No dynamic data in exception message assertions

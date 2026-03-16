# Requirements Checklist

- [ ] All authorization service files have unit tests
- [ ] All resolver field files have unit tests
- [ ] All resolver mutation files have unit tests
- [ ] Tests use Vitest 4.x globals (describe, it, expect, vi)
- [ ] Tests use NestJS Test module for DI
- [ ] Tests use MockWinstonProvider for logger
- [ ] Tests use MockCacheManager where needed
- [ ] Tests use defaultMockerFactory for auto-mocking
- [ ] Tests use repositoryProviderMockFactory for TypeORM repositories
- [ ] Tests are co-located with source files (*.spec.ts)
- [ ] Coverage >= 80% for src/domain/storage
- [ ] Lint passes (pnpm lint)
- [ ] Type check passes (pnpm exec tsc --noEmit)

# Requirements Checklist

- [ ] All authorization service files have co-located .spec.ts files
- [ ] All resolver files have co-located .spec.ts files
- [ ] Tests follow existing AAA pattern with Arrange/Act/Assert comments
- [ ] Tests use NestJS Test.createTestingModule setup pattern
- [ ] Tests use MockWinstonProvider, MockCacheManager, defaultMockerFactory
- [ ] Tests use repositoryProviderMockFactory for TypeORM repositories
- [ ] No production code changes
- [ ] All tests pass: `npx vitest run src/domain/timeline`
- [ ] Type check passes: `pnpm exec tsc --noEmit`
- [ ] Lint passes: `pnpm lint`
- [ ] Coverage >= 80% statements for calendar sub-module
- [ ] Coverage >= 80% statements for event sub-module
- [ ] Coverage >= 80% statements for timeline sub-module

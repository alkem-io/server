# Requirements Checklist

- [ ] Statement coverage >= 80% for src/domain/access
- [ ] All tests pass (npx vitest run src/domain/access)
- [ ] Lint passes (pnpm lint)
- [ ] TypeScript compiles (pnpm exec tsc --noEmit)
- [ ] Tests co-located with source files as *.spec.ts
- [ ] Tests use Vitest 4.x globals
- [ ] Tests use NestJS Test module patterns
- [ ] Tests use MockWinstonProvider, MockCacheManager, defaultMockerFactory, repositoryProviderMockFactory
- [ ] No dynamic data in exception messages
- [ ] Tests cover happy paths and error paths

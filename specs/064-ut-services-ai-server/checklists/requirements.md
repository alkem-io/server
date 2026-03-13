# Requirements Checklist

- [ ] All testable files in `src/services/ai-server/` have corresponding `.spec.ts` files
- [ ] Tests use Vitest 4.x globals (describe, it, expect, vi)
- [ ] Tests use NestJS Test module for DI
- [ ] Tests use MockWinstonProvider, defaultMockerFactory, repositoryProviderMockFactory
- [ ] All happy paths are tested
- [ ] All error/exception paths are tested
- [ ] All tests pass: `npx vitest run src/services/ai-server`
- [ ] Lint passes: `pnpm lint`
- [ ] Type check passes: `pnpm exec tsc --noEmit`
- [ ] Coverage >= 80% for the ai-server area

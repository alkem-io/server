# Unit Tests for src/tools -- Requirements Checklist

## Coverage requirements
- [ ] >=80% line coverage for `src/tools/schema/deprecation-parser.ts`
- [ ] >=80% line coverage for `src/tools/schema/override.ts`
- [ ] >=80% line coverage for `src/tools/schema/override-fetch.ts`
- [ ] `src/tools/**` removed from vitest.config.ts coverage exclusion

## Test quality requirements
- [ ] All branches of parseDeprecationReason covered
- [ ] All exported functions of override.ts covered
- [ ] fetchGitHubReviews covered with mocked fetch
- [ ] No flaky tests (no real network calls, no real file I/O)
- [ ] Tests use Vitest globals (no explicit imports of describe/it/expect)

## CI requirements
- [ ] `pnpm vitest run src/tools` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm exec tsc --noEmit` passes

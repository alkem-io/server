# Requirements Checklist

- [ ] All service/adapter files in src/services/adapters/ have co-located .spec.ts files
- [ ] >=80% line coverage for the adapters area
- [ ] All tests pass with `pnpm vitest run`
- [ ] No TypeScript compilation errors (`pnpm exec tsc --noEmit`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Tests use project conventions (Vitest globals, NestJS Test module, defaultMockerFactory)
- [ ] Tests verify error handling paths
- [ ] Tests verify conditional logic branches
- [ ] Tests verify delegation to injected services
- [ ] Existing tests remain passing

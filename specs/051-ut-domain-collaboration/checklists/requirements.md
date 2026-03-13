# Requirements Checklist

- [ ] All authorization service files in `src/domain/collaboration` have corresponding `.spec.ts` files
- [ ] `CollaborationLicenseService` has test coverage
- [ ] `sortBySortOrder` utility has test coverage
- [ ] All tests pass (`pnpm test -- src/domain/collaboration`)
- [ ] No TypeScript errors (`pnpm exec tsc --noEmit`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Coverage >= 80% for `src/domain/collaboration`
- [ ] Tests follow project conventions (Vitest globals, NestJS Test module, mock utilities)
- [ ] No dynamic data in exception messages
- [ ] Tests are co-located with source files

# Requirements Checklist

- [ ] All authorization services have tests covering: happy path, missing relations, each template type branch
- [ ] All resolver fields have tests covering: delegation to service, type-based filtering
- [ ] All resolver mutations have tests covering: authorization check, validation, service delegation
- [ ] License service has tests covering: happy path, missing collaboration
- [ ] Coverage >= 80% for `src/domain/template`
- [ ] All tests pass: `npx vitest run src/domain/template`
- [ ] Lint passes: `pnpm lint`
- [ ] TypeScript compiles: `pnpm exec tsc --noEmit`
- [ ] No changes to source files (test-only changes)

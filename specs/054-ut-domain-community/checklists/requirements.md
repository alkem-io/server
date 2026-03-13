# Requirements Checklist: Unit Tests for src/domain/community

## Coverage Requirements
- [ ] >=80% statement coverage for `src/domain/community`
- [ ] All 17+ new test files pass
- [ ] No test regressions (existing 163 tests still pass)

## Quality Requirements
- [ ] `pnpm lint` passes (no Biome errors)
- [ ] `pnpm exec tsc --noEmit` passes (no type errors)
- [ ] Tests follow established patterns (NestJS Test module, defaultMockerFactory)
- [ ] Tests are co-located with source files

## Test Content Requirements
- [ ] user.identity.service: buildKratosDataFromIdentity tests
- [ ] user.identity.service: resolveOrCreateUser - existing user by authID
- [ ] user.identity.service: resolveOrCreateUser - existing user by email + link
- [ ] user.identity.service: resolveOrCreateUser - create new user
- [ ] user.identity.service: resolveOrCreateUser - validation (empty email, unverified)
- [ ] user.identity.service: resolveByAuthenticationId - all paths
- [ ] All resolver files: instantiation ("should be defined") test
- [ ] Resolver mutations: authorization check + service delegation tests
- [ ] Resolver fields: field resolution tests
- [ ] Resolver queries: query delegation tests
- [ ] Model card resolver: static data return tests

## Process Requirements
- [ ] Spec artifacts created (spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md, checklists/requirements.md)
- [ ] Tests committed with proper message and co-author

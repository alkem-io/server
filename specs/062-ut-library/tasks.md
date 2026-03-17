# Tasks: Unit Tests for src/library

## Task 1: Expand InnovationPackService Tests
- [x] File: `src/library/innovation-pack/innovation.pack.service.spec.ts`
- Add tests for: getInnovationPackOrFail, getInnovationPackByNameIdOrFail, getProfile, getTemplatesSetOrFail, isNameIdAvailable, getTemplatesCount, getProvider, update, deleteInnovationPack, createInnovationPack, save

## Task 2: Create InnovationPackAuthorizationService Tests
- [x] File: `src/library/innovation-pack/innovation.pack.service.authorization.spec.ts`
- Test: applyAuthorizationPolicy (happy + missing relations), appendCredentialRules (indirect via missing auth)

## Task 3: Create InnovationPackResolverFields Tests
- [x] File: `src/library/innovation-pack/innovation.pack.resolver.fields.spec.ts`
- Test: templatesSet, provider field resolvers

## Task 4: Create InnovationPackResolverMutations Tests
- [x] File: `src/library/innovation-pack/innovation.pack.resolver.mutations.spec.ts`
- Test: updateInnovationPack, deleteInnovationPack with auth checks

## Task 5: Create LibraryAuthorizationService Tests
- [x] File: `src/library/library/library.service.authorization.spec.ts`
- Test: applyAuthorizationPolicy

## Task 6: Create LibraryResolverFields Tests
- [x] File: `src/library/library/library.resolver.fields.spec.ts`
- Test: innovationPacks, templates, virtualContributors, innovationHubs

## Task 7: Verify
- [x] All tests pass
- [x] Lint passes
- [x] tsc --noEmit passes
- [x] Coverage >= 80%

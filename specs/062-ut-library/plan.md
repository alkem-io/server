# Plan: Unit Tests for src/library

## Phase 1: Expand InnovationPackService Tests
Expand the existing skeleton test to cover:
- `createInnovationPack` - happy path with/without nameID
- `update` - happy path, nameID conflict, profile update, listedInStore toggle
- `deleteInnovationPack` - happy path with/without templatesSet/profile
- `getInnovationPackOrFail` - found and not-found paths
- `getInnovationPackByNameIdOrFail` - found and not-found paths
- `getProfile` - found, not-found, no-profile-initialized
- `getTemplatesSetOrFail` - found and not-found paths
- `isNameIdAvailable` - available and taken
- `getTemplatesCount` - happy path, missing templatesSet
- `getProvider` - happy path, missing account, missing provider

## Phase 2: Create InnovationPackAuthorizationService Tests
- `applyAuthorizationPolicy` - happy path, missing relations
- `appendCredentialRules` (private, tested indirectly) - missing authorization

## Phase 3: Create InnovationPackResolverFields Tests
- `profile` - delegates to loader
- `templatesSet` - delegates to service
- `provider` - delegates to service

## Phase 4: Create InnovationPackResolverMutations Tests
- `updateInnovationPack` - authorization + delegation
- `deleteInnovationPack` - authorization + delegation

## Phase 5: Create LibraryAuthorizationService Tests
- `applyAuthorizationPolicy` - reset, inherit, append credential rules

## Phase 6: Create LibraryResolverFields Tests
- `innovationPacks` - with/without query data
- `templates` - with/without filter
- `virtualContributors` - delegation
- `innovationHubs` - delegation

## Phase 7: Verify
- Run all tests
- Check coverage >= 80%
- Lint and type-check

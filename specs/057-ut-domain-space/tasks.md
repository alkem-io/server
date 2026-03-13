# Tasks: Unit Tests for src/domain/space

## Task 1: SpacePlatformRolesAccessService tests
- [x] Create `space.service.platform.roles.access.spec.ts`
- [x] Test `createPlatformRolesAccess` for L0 public/private/archived
- [x] Test `createPlatformRolesAccess` for subspace with parent access
- [x] Test error when subspace missing parent access

## Task 2: SpaceService additional coverage
- [x] Extend `space.service.spec.ts` with tests for:
  - `getSpacesForInnovationHub` (VISIBILITY, LIST, unsupported type)
  - `updateSubspacesSortOrder` (happy path, duplicates, missing IDs)
  - `getSubscriptions`
  - `createLicenseForSpaceL0`
  - `assignUserToRoles`
  - `update`
  - Various getXxxOrFail methods

## Task 3: SpaceLicenseService tests
- [x] Create `space.service.license.spec.ts`
- [x] Test `applyLicensePolicy` happy path and relation checks
- [x] Test `extendLicensePolicy` for each entitlement type

## Task 4: SpaceAuthorizationService tests
- [x] Create `space.service.authorization.spec.ts`
- [x] Test `applyAuthorizationPolicy` for L0/L1/L2
- [x] Test error paths for missing relations

## Task 5: SpaceAboutAuthorizationService tests
- [x] Create `space.about.service.authorization.spec.ts`
- [x] Test `applyAuthorizationPolicy` happy path and error paths

## Task 6: Verification
- [x] Run coverage >= 80%
- [x] Run lint
- [x] Run tsc --noEmit

# Plan: Unit Tests for src/domain/space

## Phase 1: High-Impact Service Tests
1. **SpacePlatformRolesAccessService** (288 LOC, 0% covered)
   - Pure logic, no DB calls -- highest ROI
   - Test all role privilege methods for L0/subspace, public/private, archived scenarios

2. **SpaceService** additional coverage (1707 LOC, 26% covered)
   - `getSpacesForInnovationHub` -- 3 branches (VISIBILITY, LIST, unsupported)
   - `getSubspaces` -- sorting, filtering, shuffle
   - `updateSubspacesSortOrder` -- validation, ordering
   - `getSubscriptions` -- credential filtering
   - `createLicenseForSpaceL0` -- entitlement structure
   - `assignUserToRoles` / `assignOrganizationToMemberLeadRoles`
   - `update` -- about update flow
   - Various getXxxOrFail methods

3. **SpaceLicenseService** (210 LOC, 0% covered)
   - `applyLicensePolicy` -- relation checks, entitlement loop
   - `extendLicensePolicy` -- all entitlement types

4. **SpaceAuthorizationService** (744 LOC, 0% covered)
   - `applyAuthorizationPolicy` -- L0/L1/L2 paths, visibility branches
   - Private helper methods via integration through public methods

5. **SpaceAboutAuthorizationService** (72 LOC, 0% covered)
   - `applyAuthorizationPolicy` -- parent auth propagation, error paths

## Phase 2: Verification
- Run coverage and iterate if below 80%
- Run lint and type checks

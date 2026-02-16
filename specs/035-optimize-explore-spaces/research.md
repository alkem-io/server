# Research: Optimize ExploreAllSpaces Query

**Date**: 2026-02-16
**Feature**: 035-optimize-explore-spaces

## Decision 1: Batching Strategy for Lead Users

**Decision**: Use existing `UserLookupService.usersWithCredentials()` (plural) which already accepts an array of credential criteria and builds OR conditions in a single TypeORM query.

**Rationale**: The method at `src/domain/community/user/user.lookup.service.ts:157-203` already constructs OR-based WHERE clauses for multiple credential criteria. No new query logic is needed for users — only a DataLoader wrapper.

**Alternatives considered**:
- Raw SQL query with `IN` clause on resourceIDs — rejected because `usersWithCredentials()` already handles this via TypeORM with proper relation loading
- Adding a new method grouped by resourceID — unnecessary; the DataLoader can group results itself after calling the existing method

## Decision 2: Batching Strategy for Lead Organizations

**Decision**: Add a new `organizationsWithCredentialsBatch()` method to `OrganizationLookupService` that accepts an array of credential criteria (matching the user service's pattern).

**Rationale**: The current `organizationsWithCredentials()` at `src/domain/community/organization/organization.lookup.service.ts:54-78` only accepts a single `CredentialsSearchInput`. To batch across multiple spaces, we need the plural form.

**Alternatives considered**:
- Calling the single method in a loop — defeats the purpose of batching
- Using raw SQL — inconsistent with existing TypeORM patterns in the codebase

## Decision 3: DataLoader Key Design

**Decision**: Use `roleSetId` as the DataLoader key. The batch function will:
1. Accept roleSet IDs
2. Extract LEAD credential definitions from already-loaded roleSet.roles (roles are eagerly loaded by `SpaceCommunityWithRoleSetLoaderCreator`)
3. Collect all credential criteria into a single array
4. Call the batch lookup method once
5. Group results by resourceID and map back to roleSet IDs

**Rationale**: The `SpaceAboutMembership` parent object already contains the fully loaded `roleSet` with `roles` (including credentials as JSONB). Using roleSetId allows the DataLoader to work generically across any context that has a roleSet — not just `exploreSpaces`.

**Alternatives considered**:
- Using credential resourceID as key — would require callers to extract credentials before calling the loader, breaking the generic pattern
- Using spaceAboutId as key — too tightly coupled to the Space domain; wouldn't work for other contexts (e.g., organizations with roleSets)

## Decision 4: Where to Place the Loaders

**Decision**: Create new loader creators under `src/core/dataloader/creators/loader.creators/roleset/` to align with the domain entity they serve.

**Rationale**: Follows codebase convention — loaders are organized by domain entity (see `space/`, `profile/`, `user/`, `account/` subdirectories).

**Alternatives considered**:
- Placing under `space/` directory — too specific; these loaders are generic and work for any roleSet

## Key Finding: Pre-loaded Roles

The `SpaceCommunityWithRoleSetLoaderCreator` loads `community: { roleSet: { roles: true } }`. This means when the `SpaceAboutMembershipResolverFields.leadUsers()` resolver fires, `membership.roleSet.roles` is already populated. The credential definitions (stored as JSONB on the Role entity) are available in memory — no additional DB query is needed to determine what credentials to search for.

## Key Finding: Credential Structure

From `src/domain/access/role/role.entity.ts`:
```
Role.credential: ICredentialDefinition (JSONB column)
  - type: string (e.g., AuthorizationCredential.SPACE_LEAD)
  - resourceID: string (the space/entity UUID)
```

The `getCredentialForRole()` method extracts this from the Role entity. Since roles are pre-loaded, this is a pure in-memory lookup — no DB query.

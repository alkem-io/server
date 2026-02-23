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

---

## Post-Implementation Analysis (2026-02-18)

### Query Count Reduction: 34 → 14 → 13

After initial implementation (Phases 1–4), the `ExploreAllSpaces` query was reduced from **34 queries to 14** (59% reduction) primarily through DataLoader batching of credential lookups. A subsequent analysis identified remaining redundancies, leading to one additional optimization bringing the count to **13 queries**.

### Decision 5: Merge `SpaceBySpaceAboutIdLoaderCreator` and `SpaceCommunityWithRoleSetLoaderCreator`

**Decision**: Consolidate into a single `SpaceBySpaceAboutIdLoaderCreator` that loads the superset of relations needed by both `isContentPublic` and `membership` resolvers.

**Rationale**: Both loaders were keyed by `spaceAbout.id` and loaded the same Space entity. `SpaceCommunityWithRoleSetLoaderCreator` loaded `{ about: true, community: { roleSet: { roles: true } } }` while `SpaceBySpaceAboutIdLoaderCreator` loaded `{ about: true }`. Since both are used on the same parent type (`SpaceAbout`), and the `DataLoaderInterceptor` shares a single DataLoader instance per `creatorName` per request (line 55-57 of `data.loader.interceptor.ts`), merging them means the second resolver gets a cache hit instead of firing a separate SQL query.

**What changed**:
- `SpaceBySpaceAboutIdLoaderCreator` relations expanded from `{ about: true }` to `{ about: true, community: { roleSet: { roles: true } } }`
- `membership` resolver updated to use `SpaceBySpaceAboutIdLoaderCreator` (returns `ISpace | null`) instead of `SpaceCommunityWithRoleSetLoaderCreator` (returned `ICommunity | null`)
- `SpaceCommunityWithRoleSetLoaderCreator` and its spec file deleted
- New test added for the intermediate state: Space exists but `community` is undefined

**Tradeoff**: When only `isContentPublic` is requested (without `membership`), the loader now over-fetches community+roleSet+roles. This is acceptable because: (a) the extra data is small, (b) both fields are typically requested together in the `ExploreAllSpaces` query, (c) one slightly heavier query is cheaper than two separate round-trips.

### Decision 6: Remaining Redundancies — Evaluated and Deferred

A full query-to-code tracing identified 4 additional potential optimizations. Each was evaluated for maintainability impact:

| Optimization | Saves | Verdict | Reason |
| --- | --- | --- | --- |
| Fold `about` relation into `getExploreSpaces()` (eliminate N3) | 1 query | **Deferred** | Breaks the uniform DataLoader pattern. The generic `findByBatchIds` utility always queries fresh; adding "skip if already loaded" logic would require modifying the utility used by 25+ loaders (high blast radius) or creating a special-case loader (breaks consistency). |
| Return lightweight stubs from `getExploreSpaces()` (eliminate N2) | 1 query | **Rejected** | Several field resolvers (`platformAccess`, `settings`, `createdDate`, `subscriptions`) access `@Parent()` properties directly without DataLoaders. Returning stub objects would silently break these. |
| Merge visual batches N5+N13+N14 | 2 queries | **Deferred** | These Profile→Visuals queries are identical in structure but resolve at different depths in the GraphQL tree (depth 4 for space profiles, depth 3 for user/org profiles). DataLoader batches per event-loop tick, so different depths produce separate batches. Fixing this requires fighting the fundamental DataLoader execution model. |
| Share cache between `SpaceMetricsLoaderCreator` and `SpaceBySpaceAboutIdLoaderCreator` | 1 query | **Deferred** | Metrics loader does additional work (credential counting) beyond just loading the Space. Sharing would require restructuring its batch function to consume another loader's output. |

### Key Finding: DataLoader Instance Sharing

The `DataLoaderInterceptor` (line 49-57) generates cache keys as:
```typescript
const creatorName = options?.parentClassRef
  ? `${creatorRef.name}:${options.parentClassRef.name}`
  : creatorRef.name;
```

Two `@Loader()` decorators referencing the same creator class (without `parentClassRef`) produce the same key and share a single DataLoader instance per request. This is what enables the `isContentPublic`/`membership` consolidation — both use `@Loader(SpaceBySpaceAboutIdLoaderCreator)`, so the second resolver gets a cache hit.

### Key Finding: Resolver Independence vs Query Efficiency

The remaining redundancies (N2, N3 being subsets of N6) are the natural cost of GraphQL's resolver-independence pattern. Each field resolver loads its own data through its own DataLoader, and DataLoaders don't share cached entities across different loader types. Eliminating these would require coupling resolvers or modifying the generic DataLoader infrastructure, which would hurt maintainability more than the 2-3 extra indexed queries cost in latency (< 5ms total).

### Full Query Map (13 queries, post-consolidation)

| # | Table | Relations | Trigger | Status |
| --- | --- | --- | --- | --- |
| N1 | space (seed) | activity (INNER JOIN) | `getExploreSpaces()` — activity-based ranking | Required |
| N2 | space | authorization | `getExploreSpaces()` — hydrate Space entities | Redundant (subset of N3/N6) but needed for `@Parent()` |
| N3 | space | about, authorization (x2) | `about` field → `SpaceAboutLoaderCreator` | Redundant (subset of N6) but needed for DataLoader independence |
| N4 | space_about | profile, authorization (x2) | `profile` field → `ProfileLoaderCreator` | Required |
| N5 | profile | visual, authorization (x2) | `visuals` field on space profiles → `VisualLoaderCreator` | Required |
| N6 | space | about, community, roleSet, roles, authorization (x4) | `isContentPublic` + `membership` → `SpaceBySpaceAboutIdLoaderCreator` | Required (serves both resolvers) |
| N7 | profile | tagset, authorization (x2) | `tagsets` field → `ProfileTagsetsLoaderCreator` | Required |
| N8 | user | agent, credential, authorization (x2) | `provider` → lead users by space-lead credential | Required |
| N9 | organization | agent, credential, authorization (x2) | `provider` → lead orgs by space-lead credential | Required |
| N10 | user | profile, authorization (x2) | User → Profile resolution | Required |
| N11 | organization | profile, authorization (x2) | Organization → Profile resolution | Required |
| N12 | profile | visual, authorization (x2) | `visuals` field on user profiles → `VisualLoaderCreator` | Required (separate batch tick) |
| N13 | profile | visual, authorization (x2) | `visuals` field on org profiles → `VisualLoaderCreator` | Required (separate batch tick) |

### Theoretical Minimum

If all redundancies were eliminated (including architectural changes): **9 queries**. The current 13 represents the practical optimum given the project's uniform DataLoader architecture.

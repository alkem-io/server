# Implementation Plan: Optimize ExploreAllSpaces Query

**Branch**: `035-optimize-explore-spaces` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/035-optimize-explore-spaces/spec.md`

## Summary

Eliminate the N+1 credential-lookup pattern for lead users and lead organizations in the `ExploreAllSpaces` query. Currently, resolving `leadUsers` and `leadOrganizations` triggers 60 individual PostgreSQL queries for 30 spaces (1 per space per role). The fix introduces two new generic DataLoader creators that batch all credential lookups into 2 queries (1 for users, 1 for organizations). The APM baseline of 494 average spans should drop by ~58 spans.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, dataloader (Facebook)
**Storage**: PostgreSQL 17.5 (Credential, User, Organization, Agent tables)
**Testing**: Vitest 4.x (`pnpm test:ci`)
**Target Platform**: Linux server (Docker)
**Project Type**: Single NestJS monolith
**Performance Goals**: Reduce `transaction.span_count.started` from 494 avg to ~436 (eliminate 58 credential spans)
**Constraints**: No GraphQL schema changes, no new N+1 patterns, generic/reusable loaders
**Scale/Scope**: ~5 files modified, ~2 files created, ~150 LOC net

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
| --- | --- | --- |
| 1. Domain-Centric Design | PASS | New DataLoaders follow domain service patterns. Business logic stays in domain services; loaders are infrastructure. |
| 2. Modular NestJS Boundaries | PASS | New loaders register in existing `LoaderCreatorModule`. No new modules needed. |
| 3. GraphQL Schema as Stable Contract | PASS | No schema changes. Pure backend optimization. |
| 4. Explicit Data & Event Flow | PASS | No state changes; read-only optimization. Data still flows through domain services. |
| 5. Observability & Operational Readiness | PASS | Performance-sensitive queries will have inline comments explaining the optimization. APM spans will validate the improvement. |
| 6. Code Quality with Pragmatic Testing | PASS | Risk-based approach: unit test the DataLoader batch grouping logic; integration testing via APM comparison. |
| 7. API Consistency & Evolution | PASS | No API surface changes. |
| 8. Secure-by-Design | PASS | Authorization behavior unchanged. Unauthenticated access patterns preserved. |
| 9. Container & Deployment | PASS | No infrastructure changes. |
| 10. Simplicity & Incremental | PASS | Minimal change — 2 new loaders following existing patterns. No caching layers or CQRS. |

**Post-Phase 1 re-check**: No violations. The design adds two injectable DataLoader creators following the exact pattern of `SpaceCommunityWithRoleSetLoaderCreator`.

## Project Structure

### Documentation (this feature)

```text
specs/035-optimize-explore-spaces/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── quickstart.md        # Verification guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (files affected)

```text
# NEW FILES
src/core/dataloader/creators/loader.creators/roleset/
├── lead.users.by.role.set.loader.creator.ts       # DataLoader for batching lead user lookups
└── lead.organizations.by.role.set.loader.creator.ts # DataLoader for batching lead org lookups

# MODIFIED FILES
src/core/dataloader/creators/loader.creators/index.ts
  → Export new loader creators

src/domain/space/space.about.membership/space.about.membership.resolver.fields.ts
  → Replace direct RoleSetService calls with @Loader() injected DataLoaders

src/domain/community/organization/organization.lookup.service.ts
  → Add organizationsWithCredentialsBatch() method (array of criteria)
```

**Structure Decision**: All new files go under existing directory conventions. DataLoader creators under `src/core/dataloader/creators/loader.creators/roleset/` (new subdirectory for role-set-scoped loaders, following the `space/`, `profile/`, `user/` pattern).

## Design

### Current Flow (N+1)

```
For each of 30 spaces:
  SpaceAboutMembershipResolver.leadUsers()
    → RoleSetService.getUsersWithRole(roleSet, LEAD)
      → getCredentialDefinitionForRole(roleSet, LEAD)  // in-memory (roles pre-loaded)
      → UserLookupService.usersWithCredential({ type, resourceID })  // 1 DB query
  SpaceAboutMembershipResolver.leadOrganizations()
    → RoleSetService.getOrganizationsWithRole(roleSet, LEAD)
      → getCredentialDefinitionForRole(roleSet, LEAD)  // in-memory
      → OrganizationLookupService.organizationsWithCredentials({ type, resourceID })  // 1 DB query

Total: 60 DB queries (30 × 2)
```

### Optimized Flow (batched)

```
GraphQL resolves 30 spaces' leadUsers fields:
  SpaceAboutMembershipResolver.leadUsers()
    → Extract credential from roleSet.roles (in-memory)
    → loader.load("credType|resourceID")  // queued by DataLoader

DataLoader batch fires ONCE:
  LeadUsersByRoleSetLoaderCreator.batchLoad(30 keys)
    → Parse keys into CredentialsSearchInput[]
    → UserLookupService.usersWithCredentials(30 criteria)  // 1 DB query
    → Group results by key, return in order

Same for leadOrganizations: 1 DB query total

Total: 2 DB queries
```

### Key Design Decisions

#### 1. Composite String Key: `credentialType|resourceID`

The `@Loader()` decorator pattern requires `DataLoader<string, T>` (string keys). Since the batch function needs both credential type and resourceID, the resolver serializes these into a pipe-delimited string key. The batch function parses them back.

**Why**: The `ILoader<T>` type alias is `DataLoader<string, T>`. Object keys would require a different injection pattern (like `RoleSetMembershipStatusDataLoader`) which is less generic.

**In resolver**:
```typescript
const credential = roleSet.roles?.find(r => r.name === RoleName.LEAD)?.credential;
if (!credential) return [];
return loader.load(`${credential.type}|${credential.resourceID}`);
```

#### 2. Leverage Existing `usersWithCredentials()` (Plural)

`UserLookupService.usersWithCredentials()` already accepts an array of `CredentialsSearchInput` and builds OR conditions in a single TypeORM query. The new DataLoader simply wraps this existing method.

**No new user query logic needed.**

#### 3. Add `organizationsWithCredentialsBatch()` to OrganizationLookupService

The current `organizationsWithCredentials()` only accepts a single credential. A new batch method mirrors the user service's plural pattern.

#### 4. Group Results by Credential Key After Query

After the single batched query returns all users/orgs, the DataLoader groups them by matching `agent.credentials` against the original keys. This is an O(U × K) in-memory operation where U = total users and K = batch size — negligible for typical sizes (< 100 × 30).

### File-by-File Changes

#### NEW: `src/core/dataloader/creators/loader.creators/roleset/lead.users.by.role.set.loader.creator.ts`

```typescript
@Injectable()
export class LeadUsersByRoleSetLoaderCreator implements DataLoaderCreator<IUser[]> {
  constructor(private userLookupService: UserLookupService) {}

  create(): ILoader<IUser[]> {
    return new DataLoader<string, IUser[]>(
      keys => this.batchLoad(keys),
      { cache: true, name: 'LeadUsersByRoleSetLoader' }
    );
  }

  private async batchLoad(keys: readonly string[]): Promise<IUser[][]> {
    // Parse composite keys into credential criteria
    const credentials = keys.map(parseCredentialKey);
    // Single batched query
    const allUsers = await this.userLookupService.usersWithCredentials(credentials);
    // Group by key
    return groupByCredentialKey(keys, allUsers);
  }
}
```

#### NEW: `src/core/dataloader/creators/loader.creators/roleset/lead.organizations.by.role.set.loader.creator.ts`

Same pattern, using `OrganizationLookupService.organizationsWithCredentialsBatch()`.

#### MODIFY: `src/core/dataloader/creators/loader.creators/index.ts`

Add two export lines for the new loader creators.

#### MODIFY: `src/domain/space/space.about.membership/space.about.membership.resolver.fields.ts`

Replace:
```typescript
public async leadUsers(@Parent() membership: SpaceAboutMembership): Promise<IUser[]> {
  const roleSet = membership.roleSet;
  return await this.roleSetService.getUsersWithRole(roleSet, RoleName.LEAD);
}
```

With:
```typescript
public async leadUsers(
  @Parent() membership: SpaceAboutMembership,
  @Loader(LeadUsersByRoleSetLoaderCreator) loader: ILoader<IUser[]>
): Promise<IUser[]> {
  const credential = membership.roleSet.roles?.find(r => r.name === RoleName.LEAD)?.credential;
  if (!credential) return [];
  return loader.load(`${credential.type}|${credential.resourceID}`);
}
```

Same pattern for `leadOrganizations`.

#### MODIFY: `src/domain/community/organization/organization.lookup.service.ts`

Add batch method:
```typescript
async organizationsWithCredentialsBatch(
  credentialCriteriaArray: CredentialsSearchInput[]
): Promise<IOrganization[]> {
  // Same pattern as UserLookupService.usersWithCredentials()
  // Build OR conditions, single query with IN clause
}
```

## Complexity Tracking

> No constitution violations. No complexity justifications needed.

| Metric | Value |
| --- | --- |
| Files created | 2 |
| Files modified | 3 |
| Estimated LOC | ~150 net |
| New dependencies | 0 |
| Schema changes | 0 |
| Migration needed | No |

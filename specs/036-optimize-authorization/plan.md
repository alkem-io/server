# Implementation Plan: Optimize Credential-Based Authorization

**Branch**: `036-optimize-authorization` | **Date**: 2026-02-21 | **Spec**: `specs/036-optimize-authorization/spec.md`
**Input**: Feature specification from `/specs/036-optimize-authorization/spec.md`

## Summary

Reduce authorization storage by ~80% and authorization reset time by 5x through two independent phases. Phase 1 splits each policy's credential rules into local (entity-specific) and inherited (shared via parent-owned FK), eliminating massive JSONB duplication. Phase 2 optimizes the reset traversal with batch loading, parallel subspace processing, and consolidated saves.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, RabbitMQ (amqplib), elastic-apm-node
**Storage**: PostgreSQL 17.5 — `authorization_policy` table with JSONB columns (`credentialRules`, `privilegeRules`)
**Testing**: Vitest 4.x
**Target Platform**: Linux server (Docker containers)
**Project Type**: Single NestJS monolith
**Performance Goals**: 80%+ storage reduction (SC-002), 5x reset speedup (SC-001), <10% runtime latency increase (SC-004)
**Constraints**: Zero-downtime migration (FR-010), behavioral equivalence (FR-001), 30min global reset (SC-005)
**Scale/Scope**: ~1500 users, 51 authorizable entity types, ~64 parent nodes, ~1000+ authorization policies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| 1. Domain-Centric Design First | PASS | All changes in `src/domain/common/` (authorization policy, inherited rule set) and `src/core/authorization/`. No business logic in resolvers. |
| 2. Modular NestJS Boundaries | PASS | One new module (`InheritedCredentialRuleSetModule`) in `src/domain/common/` — purpose: shared storage for parent-owned inherited rules. No circular dependencies. |
| 3. GraphQL Schema as Stable Contract | PASS | No GraphQL schema changes (FR-012). Authorization is internal infrastructure. |
| 4. Explicit Data & Event Flow | PASS | Reset flow preserved: event → consumer → tree traversal → bulk save. No new direct repository calls from resolvers. |
| 5. Observability & Operational Readiness | PASS | Phase 2 adds APM spans for reset operations using existing elastic-apm-node agent. Winston logging for reset duration/policy count. No orphaned metrics. |
| 6. Code Quality with Pragmatic Testing | PASS | Risk-based testing: unit tests for rule splitting logic and runtime check. Existing authorization tests validate behavioral equivalence (SC-003). |
| 7. API Consistency & Evolution | PASS | No API changes. |
| 8. Secure-by-Design Integration | PASS | Authorization correctness preserved (FR-001). No new external inputs. |
| 9. Container & Deployment Determinism | PASS | Online migration via standard TypeORM migration + authorization reset. No new env vars. |
| 10. Simplicity & Incremental Hardening | PASS | Simplest viable approach: parent-owned FK for deduplication (no content hashing), eager-loaded JOIN (no cache layer). |

## Project Structure

### Documentation (this feature)

```text
specs/036-optimize-authorization/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # Phase 1 data model changes
├── quickstart.md        # Developer setup guide
├── contracts/
│   └── service-contracts.md  # Internal service API changes
├── checklists/
│   └── requirements.md       # Requirements checklist
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
src/
├── domain/common/
│   ├── inherited-credential-rule-set/           # NEW module (Phase 1)
│   │   ├── inherited.credential.rule.set.entity.ts
│   │   ├── inherited.credential.rule.set.interface.ts
│   │   ├── inherited.credential.rule.set.service.ts
│   │   └── inherited.credential.rule.set.module.ts
│   ├── authorization-policy/
│   │   ├── authorization.policy.entity.ts       # MODIFIED: add inheritedCredentialRuleSet FK
│   │   ├── authorization.policy.interface.ts    # MODIFIED: add interface field
│   │   ├── authorization.policy.service.ts      # MODIFIED: inheritParentAuthorization() reads transient field
│   │   └── authorization.policy.module.ts       # MODIFIED: import InheritedCredentialRuleSetModule
│   └── entity/authorizable-entity/              # Unchanged
├── core/authorization/
│   └── authorization.service.ts                 # MODIFIED: isAccessGrantedForCredentials()
├── domain/space/
│   ├── account/account.service.authorization.ts # Phase 2: batch loading
│   └── space/space.service.authorization.ts     # Phase 2: parallel subspaces
├── services/auth-reset/
│   ├── subscriber/auth-reset.controller.ts      # Phase 2: APM spans
│   └── publisher/auth-reset.service.ts          # Phase 2: APM spans
└── migrations/
    └── <timestamp>-sharedInheritedRuleSets.ts   # Phase 1: schema migration
```

**Structure Decision**: This is an optimization of existing code within the existing NestJS monolith structure. One new module (`InheritedCredentialRuleSetModule`) is added under `src/domain/common/` following the established pattern for shared domain entities (see `authorization-policy/`, `visual/`, `media-gallery/`). All other changes are modifications to existing service files within established module boundaries.

## Phase 1: Shared Inherited Rule Sets (Storage Reduction)

**Scope**: US2, US3, US4 | FR-001–FR-008, FR-010 | SC-002, SC-003, SC-004, SC-006

Split each authorization policy's credential rules into **local** (entity-specific) and **inherited** (cascading from ancestors). Each parent node owns exactly one `InheritedCredentialRuleSet` row, referenced by all its children via an eager-loaded FK. This eliminates ~80% of JSONB storage duplication while maintaining O(1) authorization checks.

### 1.1 New Entity: InheritedCredentialRuleSet

**File**: `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.entity.ts` (NEW)

```typescript
@Entity()
@Index(['parentAuthorizationPolicyId'], { unique: true })
class InheritedCredentialRuleSet extends BaseAlkemioEntity {
  @Column('jsonb', { nullable: false })
  credentialRules: IAuthorizationPolicyRuleCredential[];

  @OneToOne(() => AuthorizationPolicy, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentAuthorizationPolicyId' })
  parentAuthorizationPolicy!: AuthorizationPolicy;

  @Column('uuid')
  parentAuthorizationPolicyId!: string;
}
```

Key decisions:
- Extends `BaseAlkemioEntity` (gets `id`, `createdDate`, `updatedDate`, `version`)
- `parentAuthorizationPolicyId` is UNIQUE + NOT NULL — each parent owns exactly one row
- `ON DELETE CASCADE` from authorization_policy — when parent entity is deleted, the shared row is automatically cleaned up
- `eager: false` on the reverse relation — we never need to load the parent from the shared row

**Interface**: `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.interface.ts` (NEW)

```typescript
abstract class IInheritedCredentialRuleSet extends IBaseAlkemio {
  credentialRules!: IAuthorizationPolicyRuleCredential[];
}
```

### 1.2 New Service: InheritedCredentialRuleSetService

**File**: `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service.ts` (NEW)

```typescript
@Injectable()
class InheritedCredentialRuleSetService {
  constructor(
    @InjectRepository(InheritedCredentialRuleSet)
    private repository: Repository<InheritedCredentialRuleSet>,
  ) {}

  /**
   * Find or create the InheritedCredentialRuleSet owned by the given parent policy.
   * Computes cascading rules from the parent's local + inherited rules.
   * If the row exists, updates credentialRules in place.
   * If not, creates a new row.
   * Also attaches the resolved set to parentAuthorization._childInheritedCredentialRuleSet
   * so that inheritParentAuthorization() can read it without a DB call.
   */
  async resolveForParent(
    parentAuthorization: IAuthorizationPolicy
  ): Promise<InheritedCredentialRuleSet>
}
```

**`resolveForParent()` logic**:
1. Compute cascading rules for children:
   - `parentAuthorization.credentialRules.filter(r => r.cascade)` (parent's own local cascade rules)
   - `+ parentAuthorization.inheritedCredentialRuleSet?.credentialRules ?? []` (parent's inherited rules — all cascade by definition)
2. `findOne({ where: { parentAuthorizationPolicyId: parentAuthorization.id } })`
3. If found → update `credentialRules`, save
4. If not found → create new row with `parentAuthorizationPolicyId` and computed `credentialRules`, save
5. Attach to parent: `parentAuthorization._childInheritedCredentialRuleSet = resolvedRow`
6. Return resolved row

**Called once per parent node** (~64 calls total for a full reset). Each parent auth service calls `resolveForParent()` before propagating to children. Children read the pre-resolved set from the parent via `inheritParentAuthorization()` — zero DB hits per child.

### 1.3 New Module: InheritedCredentialRuleSetModule

**File**: `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module.ts` (NEW)

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([InheritedCredentialRuleSet])],
  providers: [InheritedCredentialRuleSetService],
  exports: [InheritedCredentialRuleSetService],
})
export class InheritedCredentialRuleSetModule {}
```

### 1.4 Modified Entity: AuthorizationPolicy

**File**: `src/domain/common/authorization-policy/authorization.policy.entity.ts`

Add new relation:

```typescript
@ManyToOne(() => InheritedCredentialRuleSet, {
  eager: true,       // Loaded alongside the policy — zero extra queries
  cascade: false,    // Shared row, must not cascade
  onDelete: 'SET NULL',
})
inheritedCredentialRuleSet?: InheritedCredentialRuleSet;
```

**Why `eager: true`**: The `AuthorizableEntity.authorization` relation is already `eager: true`, so loading any entity automatically JOINs `authorization_policy`. Adding `eager: true` on `inheritedCredentialRuleSet` chains one more LEFT JOIN. With ~64 rows in the lookup table, the cost is negligible.

**Why `onDelete: 'SET NULL'`**: If an `InheritedCredentialRuleSet` row is deleted (e.g., parent entity deleted), the child policies fall back to evaluating `credentialRules` alone (backward compat behavior).

**Interface change**: Add to `IAuthorizationPolicy`:
- `inheritedCredentialRuleSet?: IInheritedCredentialRuleSet` — persisted FK (eager-loaded from DB)
- `_childInheritedCredentialRuleSet?: InheritedCredentialRuleSet` — **transient** (not a DB column, not decorated). Set by `resolveForParent()` on the parent policy before propagation. Read by `inheritParentAuthorization()` to assign to children without a DB call.

**Module change**: `AuthorizationPolicyModule` imports `InheritedCredentialRuleSetModule`.

### 1.5 Modified: AuthorizationPolicyService.inheritParentAuthorization()

**File**: `src/domain/common/authorization-policy/authorization.policy.service.ts`

```typescript
// Signature UNCHANGED — stays synchronous
inheritParentAuthorization(
  childAuthorization: IAuthorizationPolicy | undefined,
  parentAuthorization: IAuthorizationPolicy | undefined
): IAuthorizationPolicy
```

**New behavior**:
1. Validate/create child authorization (unchanged)
2. Reset child authorization (unchanged — clears all rules)
3. Read pre-resolved set from parent: `parentAuthorization._childInheritedCredentialRuleSet`
4. If present → set `child.inheritedCredentialRuleSet = resolvedRow` (no DB call, no rule copying)
5. If absent → fall back to current behavior (copy cascade rules from parent into child's `credentialRules`) for backward compatibility during transition
6. Return child (with empty `credentialRules` — local rules are added later by callers via `appendCredentialRules()`)

**Key difference**: No longer copies cascade rules into child's `credentialRules`. Instead, reads the pre-resolved shared row from the parent's transient field and assigns the FK reference. The method stays synchronous — all async work (resolving the shared row) happens once per parent in `resolveForParent()` before children are processed.

**No signature change means no changes to the ~50 callers.** The `resolveForParent()` call is added at the ~15-20 parent propagation sites instead (see section 1.7).

### 1.6 Modified: AuthorizationService.isAccessGrantedForCredentials()

**File**: `src/core/authorization/authorization.service.ts`

Signature unchanged. Behavioral change:

```typescript
// BEFORE: iterate one array
for (const rule of authorization.credentialRules) { ... }

// AFTER: iterate inherited first (larger pool, faster early exit), then local
if (authorization.inheritedCredentialRuleSet) {
  for (const rule of authorization.inheritedCredentialRuleSet.credentialRules) { ... }
}
for (const rule of authorization.credentialRules) { ... }
// Fallback: if inheritedCredentialRuleSet is null, credentialRules contains full rules (backward compat)
```

### 1.7 Parent Propagation Sites (~15-20 authorization services)

Since `inheritParentAuthorization()` stays synchronous, the ~50 leaf callers need **zero changes**. The only changes are at the **parent propagation sites** — services that have children and call `propagateAuthorizationToChildEntities()` or equivalent. These need one `resolveForParent()` call before propagating:

```typescript
// BEFORE (in parent auth service, before propagating to children)
// ... set up own rules ...
// propagate to children

// AFTER (add one line before propagation)
await this.inheritedCredentialRuleSetService.resolveForParent(entity.authorization);
// ... propagate to children (inheritParentAuthorization() reads the transient field)
```

Each parent auth service needs:
1. Inject `InheritedCredentialRuleSetService` via constructor
2. Call `resolveForParent()` once before child propagation
3. Its module must import `InheritedCredentialRuleSetModule`

**Parent propagation sites** (services that propagate authorization to children):

| Service | Children propagated to |
|---------|----------------------|
| `PlatformAuthorizationPolicyService` | forum, licensing-framework, license-policy |
| `AccountAuthorizationService` | spaces, agent, license, storage-aggregator, VCs, innovation packs/hubs |
| `SpaceAuthorizationService` | community, agent, storage-aggregator, collaboration, license, templates-manager, space-about, subspaces (recursive) |
| `CollaborationAuthorizationService` | callouts-set, innovation-flow, timeline |
| `CalloutsSetAuthorizationService` | callouts (loop) |
| `CalloutAuthorizationService` | callout-framing, callout-contributions (loop) |
| `CommunityAuthorizationService` | role-set, user-groups, community-guidelines |
| `StorageAggregatorAuthorizationService` | storage-buckets (loop) |
| `StorageBucketAuthorizationService` | documents (loop) |
| `TemplatesManagerAuthorizationService` | templates-set |
| `TemplatesSetAuthorizationService` | templates (loop) |
| `TimelineAuthorizationService` | calendar |
| `CalendarAuthorizationService` | events (loop) |
| `ProfileAuthorizationService` | references, visuals, tagsets |
| `UserAuthorizationService` | agent, user-settings, profile |
| `OrganizationAuthorizationService` | agent, profile, groups |
| `AiServerAuthorizationService` | ai-personas |
| `ForumAuthorizationService` | discussions |

**~50 leaf callers** (callout-framing, link, post, memo, visual, document, etc.) need **no changes** — they call `inheritParentAuthorization()` which reads the already-resolved transient field from the parent policy.

### 1.8 Migration

**File**: `src/migrations/<timestamp>-sharedInheritedRuleSets.ts` (NEW)

```sql
-- Up migration
CREATE TABLE "inherited_credential_rule_set" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
  "version" integer NOT NULL,
  "credentialRules" jsonb NOT NULL,
  "parentAuthorizationPolicyId" uuid NOT NULL,
  CONSTRAINT "PK_inherited_credential_rule_set" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_inherited_credential_rule_set_parent" UNIQUE ("parentAuthorizationPolicyId"),
  CONSTRAINT "FK_inherited_credential_rule_set_parent" FOREIGN KEY ("parentAuthorizationPolicyId")
    REFERENCES "authorization_policy"("id") ON DELETE CASCADE
);

CREATE INDEX "IDX_inherited_credential_rule_set_parent"
  ON "inherited_credential_rule_set" ("parentAuthorizationPolicyId");

ALTER TABLE "authorization_policy"
  ADD "inheritedCredentialRuleSetId" uuid;

ALTER TABLE "authorization_policy"
  ADD CONSTRAINT "FK_authorization_policy_inherited_rule_set"
  FOREIGN KEY ("inheritedCredentialRuleSetId")
  REFERENCES "inherited_credential_rule_set"("id") ON DELETE SET NULL;
```

```sql
-- Down migration
ALTER TABLE "authorization_policy" DROP CONSTRAINT "FK_authorization_policy_inherited_rule_set";
ALTER TABLE "authorization_policy" DROP COLUMN "inheritedCredentialRuleSetId";
DROP TABLE "inherited_credential_rule_set";
```

**Deployment sequence**:
1. Run schema migration (adds table + FK column, no data changes)
2. Deploy updated code (with null fallback in `isAccessGrantedForCredentials()`)
3. Trigger full authorization reset (populates `InheritedCredentialRuleSet` rows, strips inherited rules from policies)
4. Verify storage reduction and correctness

### 1.9 Testing Strategy

**Risk-based approach** per Constitution principle 6:

1. **Unit tests for rule splitting logic**: Verify that `resolveForParent()` correctly computes cascading rules from parent's local + inherited rules
2. **Unit tests for runtime check**: Verify that `isAccessGrantedForCredentials()` evaluates inherited + local rules correctly, including null fallback
3. **Existing authorization test suite**: All existing tests must pass (SC-003) — this validates behavioral equivalence without needing new tests for every entity type
4. **Storage verification**: Manual SQL check confirming ≥80% reduction (SC-002)

## Phase 2: Reset Optimization

**Scope**: US1, US3, US4 | FR-001–FR-007, FR-009, FR-011, FR-012 | SC-001, SC-003, SC-004, SC-005

Optimize the authorization reset traversal with batch loading, parallel subspace processing, consolidated saves, and APM instrumentation. No data model changes — builds on Phase 1 infrastructure.

### 2.1 Batch Loading

**Target**: Eliminate N+1 query patterns by pre-loading entire entity sub-trees.

**File**: `src/domain/space/space/space.service.authorization.ts`

Currently, `applyAuthorizationPolicy()` loads the space with relations, then each child auth service re-loads its entity individually. Change to: load the space with ALL nested relations needed for the full sub-tree in a single query (or 2-3 targeted queries). Pass pre-loaded entities down through the traversal.

**Approach**: Add optional `preloadedSpace?: ISpace` parameter to `SpaceAuthorizationService.applyAuthorizationPolicy()`. When provided, skip the initial `spaceService.getSpaceOrFail()` call. The caller (AccountAuthorizationService or recursive self-call) provides the pre-loaded entity.

Similarly for child services: `CalloutAuthorizationService`, `CommunityAuthorizationService`, etc. — add optional pre-loaded entity parameters.

### 2.2 Parallel Subspace Processing

**Target**: Process independent subspace trees concurrently.

**File**: `src/domain/space/space/space.service.authorization.ts`

Currently: `for (const subspace of space.subspaces) { await this.applyAuthorizationPolicy(...) }`

Change to: `await Promise.all(space.subspaces.map(subspace => this.applyAuthorizationPolicy(...)))` with bounded concurrency (max 5 concurrent subspaces) to avoid connection pool exhaustion.

### 2.3 Eliminate Intermediate Saves

**Target**: Remove per-entity `save()` calls during traversal. Collect all modified policies and save once at the end.

Currently:
- `AccountAuthorizationService.applyAuthorizationPolicy()` saves account policy individually (line 106)
- `SpaceAuthorizationService.applyAuthorizationPolicy()` saves space policy individually (line 215)
- `SpaceAuthorizationService` saves subspace authorizations per subspace (line 240)
- `AuthResetController` does final `saveAll()` with the returned array

Change to:
- No individual saves during traversal
- All policies collected in a single array
- One `saveAll()` call at the end in `AuthResetController`

### 2.4 APM Instrumentation

**Files**:
- `src/services/auth-reset/subscriber/auth-reset.controller.ts`
- `src/domain/space/account/account.service.authorization.ts`
- `src/domain/space/space/space.service.authorization.ts`
- `src/domain/common/authorization-policy/authorization.policy.service.ts`

Add APM spans at:
- `authResetAccount()` handler (transaction-level, labels: `policyCount`, `treeRootType`, `entityId`)
- `applyAuthorizationPolicy()` per space (span with `spaceId`, `level`)
- `saveAll()` (span with `policyCount`)

Add Winston logging:
- Reset start/end with duration and policy count (FR-011)
- Warning threshold for resets exceeding expected duration

### 2.5 Testing Strategy

1. **Existing test suite**: Must pass (SC-003)
2. **Performance benchmark**: Manual measurement comparing reset duration before and after (SC-001)
3. **Load test**: Global reset on production-scale data — verify completion within 30 minutes (SC-005)

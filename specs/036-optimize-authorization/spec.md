# Feature Specification: Optimize Credential-Based Authorization

**Feature Branch**: `036-optimize-authorization`
**Created**: 2026-02-21
**Status**: Draft
**Input**: User description: "Optimize credential-based authorization system - make it faster, lighter, reduce DB storage and tree traversal overhead"

## Problem Analysis

### Current Architecture

The Alkemio server uses a **precomputed, materialized authorization policy** model. Every entity in the system that requires access control extends `AuthorizableEntity`, which gives it a dedicated `AuthorizationPolicy` database row containing:

- **credentialRules** (JSONB): Rules mapping credentials to granted privileges
- **privilegeRules** (JSONB): Rules mapping one privilege to another

There are **51 entity types** that extend `AuthorizableEntity`. Each instance of each entity type gets its own `AuthorizationPolicy` record.

### The Authorization Forest

Authorization is organized as a forest of 5 trees rooted at: **Platform**, **User**, **Organization**, **Account**, and **AiServer**. The Account tree is the largest and most complex, containing recursive Space sub-trees (L0 -> L1 -> L2), each with Community, Collaboration, Callouts, Templates, Storage, and many more child entities.

### How Authorization Reset Works

When authorization needs to be recalculated (e.g., after a settings change, role assignment, or global reset):

1. The system starts at a tree root (e.g., Account)
2. Resets the root entity's policy and applies root-level rules
3. Recursively walks down every branch, for each child entity:
   - Loading the entity and all required relations from the database
   - Resetting the child's policy
   - Inheriting cascading credential rules from the parent
   - Appending entity-specific rules
   - Saving the updated policy back to the database
4. This continues until every leaf node has been visited

### Identified Performance Bottlenecks

1. **Massive storage duplication**: Cascading credential rules are copied verbatim into every child entity's policy. A single Space with 50 callouts produces 50+ nearly identical JSONB blobs. The `authorization_policy` table consumes ~99% of total database storage.

2. **Sequential tree traversal**: Subspaces are processed sequentially (`for (const subspace of space.subspaces) { await this.applyAuthorizationPolicy(...) }`). Each subspace triggers its own full recursive traversal with individual DB loads.

3. **N+1 query patterns**: Each entity in the tree is loaded individually with its relations, resulting in hundreds or thousands of individual queries per reset.

4. **Individual saves followed by bulk saves**: The space's own policy is saved individually before child propagation, then subspace authorizations are bulk-saved per subspace. The chunked save warns when saving >500 policies at once.

5. **Full reset is expensive**: A "reset all" publishes events via RabbitMQ for every account, organization, and user individually. Each event triggers a full tree traversal for that root entity.

### Approach Rationale: Shared Inherited Rule Sets

An early candidate approach was to store only **delta (entity-specific) rules** in each policy and walk the parent chain at authorization-check time to assemble the full rule set. This approach was abandoned because resolving a single access decision would require **N sequential database queries** (one per ancestor level) to reconstruct the complete policy, and the existing parent-policy reference is not eagerly loaded. Recursive relation loading is not supported by the underlying ORM, so this chain walk cannot be collapsed into a single query. The runtime cost would negate any storage savings.

The chosen approach is **Shared Inherited Credential Rule Sets**. Instead of duplicating cascading rules into every child policy, the system:

1. **Splits** each policy's credential rules into two parts: **local rules** (specific to the entity) and **inherited rules** (cascading rules received from ancestors).
2. **Deduplicates** inherited rule sets: many entities at the same level in the same tree share identical inherited rules. These are stored once in a shared lookup table and referenced via a foreign key that is eagerly loaded alongside the policy.
3. **Maintains O(1) authorization checks**: because the inherited rule set is loaded with the policy (no chain walking), access decisions require no additional queries beyond the existing single-policy load.

**Storage math**: In a typical Space tree, most entities share one of ~64 distinct inherited rule set combinations (varying by tree depth and Space privacy mode). With ~1000 policies in a medium deployment, replacing ~1000 full JSONB blobs with ~64 shared rows achieves an estimated **~81% storage reduction** while adding zero runtime query overhead. _(Estimation methodology: a representative L2 entity policy currently stores ~8 inherited rules averaging ~200 bytes each = ~1.6KB inherited + ~0.4KB local per policy. Post-optimization, each policy stores only ~0.4KB local + one 16-byte FK, while the ~64 shared rows store ~1.6KB each. Net: ~1000 × 2KB → ~1000 × 0.4KB + ~64 × 1.6KB ≈ 81% reduction.)_

**Rejected alternative — PostgreSQL JSONB query-level optimization**: PostgreSQL supports GIN indexes and containment operators (`@>`) for JSONB columns, which could theoretically push credential matching into SQL. This was evaluated and rejected because: (1) authorization checks are performed in-memory on already-loaded entities (the AuthorizationPolicy is eagerly loaded via JOIN for business logic — no separate query is needed); (2) GIN indexes impose write overhead on every policy save during resets, directly conflicting with Phase 2 performance goals; (3) the two-phase check logic (credential rules → privilege rules) is complex to express in SQL; (4) Phase 1's storage reduction keeps local `credentialRules` below PostgreSQL's ~2KB TOAST threshold, so the JSONB stays inline in the row — eliminating the main I/O cost of large JSONB reads without any index.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Faster Authorization Reset for Platform Administrators (Priority: P1, Phase 2)

As a platform administrator, when I trigger an authorization reset (e.g., after changing space privacy settings or modifying role assignments), I need the operation to complete significantly faster so that the platform remains responsive and changes take effect promptly.

**Why this priority**: Authorization reset is the most common operation that triggers the full tree traversal. Platform administrators currently experience long wait times during resets, and the operation puts heavy load on the database, potentially affecting all users.

**Independent Test**: Can be tested by triggering an authorization reset on an account with multiple spaces and subspaces, measuring the total duration and database load before and after optimization.

**Acceptance Scenarios**:

1. **Given** a platform with an account containing 3 spaces, each with 5 subspaces (L1), each with 3 sub-subspaces (L2), **When** an administrator triggers an authorization reset for that account, **Then** the reset completes at least 5x faster than the current baseline.
2. **Given** the same platform setup, **When** the reset is running, **Then** normal read operations (GraphQL queries) do not exceed a 15% increase in p99 latency for other users.
3. **Given** a global "reset all" is triggered, **When** there are ~1500 users with proportional accounts and organizations, **Then** the full reset completes within 30 minutes (SC-005) without exhausting database connections or timeout errors.

---

### User Story 2 - Reduced Database Storage Footprint (Priority: P1, Phase 1)

As a platform operator, I need the authorization data to consume a dramatically smaller portion of the database so that storage costs are manageable, backups are faster, and database maintenance operations (vacuum, reindex) complete in reasonable time.

**Why this priority**: The authorization_policy table at ~99% of database storage is unsustainable as the platform grows. This directly impacts operational costs, backup times, disaster recovery speed, and database performance.

**Independent Test**: Can be tested by comparing database size (specifically the authorization_policy table) before and after migration, verifying that all authorization checks still produce correct results.

**Acceptance Scenarios**:

1. **Given** a platform with current data, **When** the authorization storage optimization is applied, **Then** the total storage used by authorization data is reduced by at least 80%.
2. **Given** the storage has been optimized, **When** any authorization check is performed, **Then** the access decision is identical to what the pre-optimization system would have produced.
3. **Given** the storage has been optimized, **When** new entities are created, **Then** the incremental storage per entity is at least 80% smaller than before.

---

### User Story 3 - Maintained Authorization Correctness (Priority: P1, Phase 1+2)

As a space member, admin, or anonymous user, my access permissions must remain exactly the same after the optimization. The system must grant and deny access identically to the current behavior.

**Why this priority**: Authorization correctness is non-negotiable. Any regression in access control is a security vulnerability. This story validates that the optimization does not alter behavior.

**Independent Test**: Can be tested by running the full authorization test suite against both the old and new implementations and verifying identical results for all test cases.

**Acceptance Scenarios**:

1. **Given** a user with SPACE_MEMBER credential for Space A, **When** they attempt to READ content in Space A, **Then** access is granted (same as before).
2. **Given** an anonymous user, **When** they attempt to READ content in a private space, **Then** access is denied (same as before).
3. **Given** a space admin changes a subspace from PUBLIC to PRIVATE, **When** authorization is recalculated, **Then** only members of that subspace retain READ access to its content (same as before).
4. **Given** cascading credential rules from a parent entity, **When** a child entity's access is checked, **Then** the inherited rules are correctly applied (same as before).

---

### User Story 4 - Faster Authorization Checks at Runtime (Priority: P2, Phase 1+2)

As any user interacting with the platform, authorization checks on my API requests should not become slower as a result of the optimization. Ideally, they should be faster due to reduced data retrieval overhead.

**Why this priority**: Every GraphQL query triggers authorization checks. Even small per-request improvements compound across thousands of daily requests. However, the current check mechanism is already relatively fast (in-memory JSON evaluation), so this is secondary to reset performance and storage reduction.

**Independent Test**: Can be tested by benchmarking authorization check latency on a representative set of entities before and after optimization.

**Acceptance Scenarios**:

1. **Given** the optimized system, **When** a user makes a standard GraphQL query that checks authorization on a space entity, **Then** the authorization check latency is no worse than the current baseline.
2. **Given** the optimized system, **When** authorization rules are evaluated, **Then** privilege rules (e.g., READ implies READ_ABOUT) still function correctly.

---

### Edge Cases

- **Concurrent read during reset**: When a parent entity's policy is updated while a child entity's access is being checked concurrently, the authorization check uses the last fully persisted policy state (eventual consistency within a single reset cycle). No partial/corrupt rules are returned.
- **Orphaned policies**: Authorization policies for deleted entities are cleaned up during the next reset cycle or via periodic garbage collection. Orphaned policies do not affect access decisions for active entities.
- **Partial reset failure**: If a reset fails mid-traversal (e.g., completes for some branches but fails for others), the system logs the failure with affected branch details and the failed branches retain their pre-reset policies. A retry of the same reset re-processes only the full tree (idempotent).
- **Hierarchy depth beyond 3 levels**: The authorization hierarchy is designed for the current 3-level depth (L0/L1/L2). Deeper hierarchies would work structurally but are not optimized for; future expansion beyond 3 levels requires explicit performance validation.
- **Concurrent privacy change during reset**: When a space switches from PUBLIC to PRIVATE while authorization is being recalculated for another space in the same account, the privacy change triggers a new reset that is serialized (queued) behind the in-progress reset. The queued reset will apply the latest privacy settings.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST produce identical access decisions (grant/deny) for all credential+entity combinations as the current system
- **FR-002**: System MUST support the full authorization forest hierarchy (5 roots, edge nodes, leaf nodes) with correct cascading of credential rules
- **FR-003**: System MUST support privilege rule mappings (e.g., READ implies READ_ABOUT) identically to the current behavior
- **FR-004**: System MUST allow authorization reset to be triggered per account, per organization, per user, for the platform, and globally (reset all)
- **FR-005**: System MUST handle concurrent authorization resets for different tree roots without conflicts. Concurrent resets for the same tree root MUST be serialized (queued) — the second reset waits until the first completes
- **FR-006**: System MUST maintain the existing RabbitMQ-based async reset mechanism for distributing reset work
- **FR-007**: System MUST support the visibility layer (READ_ABOUT credential filtering) for space privacy modes (PUBLIC/PRIVATE) and visibility states (ACTIVE/DEMO/ARCHIVED)
- **FR-008**: System MUST reduce the amount of duplicated authorization rule data stored in the database
- **FR-009**: System MUST reduce the number of individual database operations during a full authorization reset
- **FR-010**: System MUST provide an online migration path from the current storage model to the optimized model while the server remains operational (no maintenance window). Brief elevated database load during migration is acceptable. Rollback is handled via database-level backup/restore; no in-database dual-model retention is required
- **FR-011**: System MUST log authorization reset operations with sufficient detail for debugging, including the number of policies updated and the duration
- **FR-012**: System MUST instrument authorization reset operations with Elastic APM spans (duration, policy count, tree root type) for operational observability. No new GraphQL schema surface is introduced

### Key Entities

- **AuthorizationPolicy**: The core entity storing credential rules and privilege rules for a single authorizable entity. Currently stores full inherited + local rules; target is to store only entity-specific (local) rules with an eager-loaded reference to a shared inherited rule set.
- **AuthorizableEntity**: Abstract base class extended by all 51 entity types requiring authorization. Has a one-to-one eager-loaded relation to AuthorizationPolicy.
- **AuthorizationPolicyRuleCredential**: Defines a mapping from credentials to granted privileges, with a cascade flag indicating whether the rule should be inherited by children.
- **AuthorizationPolicyRulePrivilege**: Defines a mapping from one privilege to other privileges (e.g., READ -> READ_ABOUT).
- **InheritedCredentialRuleSet**: A shared record storing the pre-merged cascading credential rules inherited from an entity's ancestor chain. Each parent node in the authorization forest owns exactly one InheritedCredentialRuleSet row, identified by a `parentAuthorizationPolicyId` FK (UNIQUE). All direct children of that parent reference the same row via their policy's `inheritedCredentialRuleSetId` FK. On reset, the existing row is found by `parentAuthorizationPolicyId` and updated in place — no orphans, no garbage collection. The table has stable cardinality (~64 rows). Each AuthorizationPolicy has an optional eager-loaded reference to one InheritedCredentialRuleSet. During authorization checks, the inherited rule set is evaluated first (higher match probability due to larger rule count), followed by the policy's local rules — no parent chain traversal is needed.

## Clarifications

### Session 2026-02-21

- Q: What rollback strategy is required if issues are discovered after deploying the new authorization model? → A: Old data is backed up at the database level before migration and can be restored if needed. No in-database retention of deprecated authorization data is required.
- Q: Should this be delivered as a single release or in incremental phases? → A: Phased delivery. **Updated** — Phase 1: shared inherited rule sets (storage reduction via deduplication). Phase 2: optimize reset operations (bulk queries, parallelization, APM instrumentation). Each phase delivers standalone value and can be validated independently.
- Q: What does "without downtime" mean for the authorization storage migration (FR-010)? → A: Online migration — the server stays fully operational while a background migration process runs. Brief periods of elevated database load are acceptable. No maintenance window or server restart is required for the migration itself.
- Q: How should concurrent authorization resets for the same tree root be handled? → A: Serialize by queuing — the second reset waits until the first completes. RabbitMQ single-consumer queues provide natural serialization.
- Q: What is the maximum acceptable wall-clock time for a global "reset all"? → A: 30 minutes, for a platform with ~1500 users and proportionally more accounts/organizations than originally stated.
- Q: Which user stories, FRs, and SCs belong to which delivery phase? → A: **Updated** — phases were reordered (see session below). Phase 1 (shared inherited rule sets — storage reduction): US2, US3, US4, FR-001–FR-008, FR-010, SC-002, SC-003, SC-004, SC-006. Phase 2 (reset optimization — bulk loading, parallelization, APM): US1, US3, US4, FR-001–FR-007, FR-009, FR-011, FR-012, SC-001, SC-003, SC-004, SC-005.
- Q: Should the optimization add operational metrics beyond logging, and does it require GraphQL schema changes? → A: Add Elastic APM spans for reset operations (duration, policy count, tree root type) using the existing APM infrastructure. No new GraphQL schema changes are required.

### Session 2026-02-21 (Hash Removal)

- Q: What should replace the content hash for deduplication of InheritedCredentialRuleSet rows? → A: Parent-based ownership. Each parent node owns exactly one InheritedCredentialRuleSet row, identified by a `parentAuthorizationPolicyId` FK (UNIQUE). Rationale: since inherited rules contain ancestor UUIDs as resourceIDs, non-siblings can never produce identical content — the hash only ever matched siblings, which parent ownership handles directly.
- Q: How should InheritedCredentialRuleSet rows be managed across resets? → A: Updated in place. On reset, the existing row is found by `parentAuthorizationPolicyId` and its `credentialRules` updated. All children already reference it. No orphans, no garbage collection. The table has stable cardinality (~64 rows).

### Session 2026-02-21 (PostgreSQL JSONB Optimization)

- Q: Should the spec document that PostgreSQL JSONB query-level optimizations (GIN indexes, containment operators) were evaluated and rejected? → A: Yes. Document as rejected alternative. Authorization checks are in-memory after eager load, making SQL-level JSONB queries redundant (would add a query where currently there are zero). GIN indexes add write overhead that conflicts with reset performance (Phase 2). Phase 1's size reduction already eliminates TOAST decompression overhead by keeping local credentialRules below the ~2KB inline threshold.

### Session 2026-02-21 (Runtime Optimization)

- Q: Should the runtime authorization check evaluate inherited rules before local rules to optimize for early exit? → A: Yes. Evaluate inherited rules first, then local rules. Most entities have many inherited rules (5-15 from ancestors) but few or zero local rules (0-3). Since the check returns on the first match, evaluating the larger inherited pool first maximizes early exit probability for common operations.

### Session 2026-02-21 (Phase Reorder)

- Q: Why was the original Phase 2 approach (delta-only policies with parent chain walking) abandoned? → A: Resolving a single authorization check under the delta-only model requires N sequential database queries to walk the parent chain and reconstruct the full rule set. The existing parent-policy reference is not eagerly loaded, and the ORM does not support recursive relation loading, so the chain walk cannot be collapsed into a single query. The runtime cost would negate the storage savings.
- Q: What replaces the delta-only approach? → A: Shared Inherited Credential Rule Sets. Each policy's credential rules are split into local (entity-specific) and inherited (cascading from ancestors). Inherited rule sets are deduplicated by content identity and stored in a shared lookup table. Each policy holds an eager-loaded foreign key to its inherited rule set, so authorization checks require zero additional queries.
- Q: Why were the phases reordered? → A: The storage reduction (now Phase 1) is a prerequisite that delivers standalone value and reduces the data volume that Phase 2 (reset optimization) must process. Delivering storage reduction first also simplifies the reset optimization work, since policies become smaller and shared rule sets can be computed once per unique ancestor chain rather than copied per entity.
- Q: What happens during the deployment window when some policies have an InheritedCredentialRuleSet reference and some do not? → A: Backward compatibility: a null inherited rule set reference means the policy uses its existing full credential rules (pre-migration behavior). The migration populates inherited rule set references incrementally. Authorization checks work correctly throughout the transition.

## Assumptions

- The current authorization model (credential-based with cascading rules) is the correct model and should be preserved. The optimization should not change the authorization model itself, only how policies are stored and computed.
- The authorization forest structure (5 roots, tree hierarchy) will remain stable. No new root types are expected in the near term.
- The RabbitMQ-based async reset mechanism is appropriate and should be retained, though its usage patterns may be optimized.
- Shared inherited credential rule sets can achieve 80%+ storage reduction because the majority of stored data is duplicated cascading rules, and entities at the same tree depth within a space share identical inherited rule sets.
- The number of distinct inherited rule set rows is small (~64 in a typical deployment, one per unique parent node) relative to the total number of policies (~1000+), making the shared-row approach highly effective.
- Runtime authorization checks remain O(1) because the inherited rule set is loaded alongside the policy via an eager-loaded reference — no parent chain traversal is needed.
- During the migration deployment window, policies without an inherited rule set reference (null) fall back to their existing full credential rules, ensuring backward compatibility with no downtime.
- Delivery is phased: Phase 1 (shared inherited rule sets — storage reduction) can ship independently before Phase 2 (reset optimization). Each phase has its own success criteria subset.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001** _(Phase 2)_: Full authorization reset for an account with a 3-level space hierarchy (3 L0 spaces, 5 L1 subspaces each, 3 L2 sub-subspaces each) completes at least 5x faster than the current baseline
- **SC-002** _(Phase 1)_: Database storage consumed by authorization data is reduced by at least 80% compared to the current baseline
- **SC-003** _(Phase 1+2)_: All existing authorization-related tests pass without modification (proving behavioral equivalence)
- **SC-004** _(Phase 1+2)_: Runtime authorization check latency (per-request) does not increase by more than 10% compared to the current baseline
- **SC-005** _(Phase 2)_: The global "reset all" operation for a production-scale platform (~1500 users, proportional accounts and organizations) completes within 30 minutes without database connection exhaustion or timeout errors
- **SC-006** _(Phase 1)_: Incremental storage cost per new entity created is reduced by at least 80%

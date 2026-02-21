# Research: Optimize Credential-Based Authorization

**Branch**: `036-optimize-authorization` | **Date**: 2026-02-21

## Research Areas

### R1: Current Authorization Tree Structure & Entity Count

**Decision**: The authorization forest has 5 roots and ~50 authorization service classes (one per authorizable entity type).

**Rationale**: Code analysis reveals:
- **5 roots** (R): Platform, User, Organization, Account, AiServer
- **~35 edge nodes** (E): internal nodes that inherit + propagate to children
- **~15 leaf nodes** (L): terminal nodes that only inherit
- **51 entity types** extend `AuthorizableEntity`, each with a 1:1 eager-loaded `AuthorizationPolicy`

The **Account tree** is by far the largest and most complex, containing recursive Space sub-trees (L0 -> L1 -> L2). Each Space sub-tree includes: Agent, Community (RoleSet, UserGroups, Guidelines), Collaboration (CalloutsSet, Callouts, InnovationFlow+States, Timeline+Calendar+Events, Links, Whiteboards, Memos), About (Profile+children), StorageAggregator (Buckets, Documents), License, and (L0 only) TemplatesManager.

**Alternatives considered**: None (this is observational research).

---

### R2: Current Reset Performance Bottlenecks

**Decision**: Five major bottleneck categories identified, all addressable in Phase 1.

**Rationale**:

1. **N+1 Entity Loading**: Each `applyAuthorizationPolicy()` call loads its entity individually with relations. For example, `SpaceAuthorizationService` loads the space, then `CollaborationAuthorizationService` re-loads the collaboration, then `CalloutsSetAuthorizationService` re-loads the callouts set, then each `CalloutAuthorizationService` loads each callout individually. A Space with 20 callouts triggers 20+ individual SELECT queries just for callouts, plus their children (contributions, framing, comments, classification).

2. **Sequential Subspace Traversal**: In `SpaceAuthorizationService.applyAuthorizationPolicy()` (line 231-243), subspaces are processed with `for...of await`, meaning each subspace's full recursive tree must complete before the next begins. This is inherently serializable but needlessly sequential for independent subtrees.

3. **Intermediate Individual Saves**: The space's own policy is saved via `authorizationPolicyService.save()` (line 215-217) before propagating to children. This is one save per space, per level. Meanwhile, `authResetController` does a final bulk `saveAll()` at the end. The intermediate saves are redundant if the full tree is computed in memory first.

4. **Rule Duplication During Cascade**: `inheritParentAuthorization()` copies all `cascade: true` rules from parent to child by value. With ~10 cascading rules on a typical space and 50+ child entities, this creates 500+ redundant rule copies in memory during traversal.

5. **Per-Event Publishing**: `publishResetAll()` publishes one RabbitMQ event per account, per user, per organization. Each event is consumed independently, each triggers a full tree traversal. For 100 accounts, this means 100 independent tree traversals that could share some computation.

**Alternatives considered**:
- Considered caching resolved policies in Redis, but this would add infrastructure dependency and doesn't address the reset speed itself.
- Considered pre-computing rule sets at the database level (materialized views), rejected because the rules are computed in application code with complex logic.

---

### R3: Runtime Authorization Check Path

**Decision**: Runtime checks are fast (in-memory JSONB evaluation). Phase 1 modifies the check to iterate two arrays (local + inherited) instead of one, but the total rules evaluated and query cost are unchanged.

**Rationale**: The check path in `AuthorizationService.isAccessGrantedForCredentials()`:
1. Reads `credentialRules` from the entity's `AuthorizationPolicy` (already loaded via eager relation)
2. Iterates credential rules, matching agent credentials against rule criteria
3. If no direct match, checks `privilegeRules` for privilege escalation (e.g., READ -> READ_ABOUT)
4. Returns boolean - purely in-memory, zero additional DB queries

This design is efficient. The JSONB data is deserialized to typed objects by TypeORM on entity load. The current latency is dominated by the entity load (which already happens for the business operation), not the authorization check itself.

**Alternatives considered**:
- Adding an in-memory LRU cache for resolved policies was considered but is unnecessary — the inherited rule set is loaded eagerly via FK join, so no additional resolution is needed.

---

### R4: JSONB Storage Analysis

**Decision**: `credentialRules` JSONB is the primary storage consumer. Each credential rule object is ~200-500 bytes, and a typical entity accumulates 5-15 cascading rules from ancestors plus 1-3 local rules.

**Rationale**: A serialized `AuthorizationPolicyRuleCredential` looks like:
```json
{
  "grantedPrivileges": ["READ", "UPDATE", "CREATE", "DELETE", "GRANT"],
  "criterias": [{"type": "account-admin", "resourceID": "uuid-here"}],
  "cascade": true,
  "name": "account-manage"
}
```

A single rule is ~150-400 bytes depending on the number of privileges and criteria. A typical L2 sub-subspace accumulates:
- Platform root rules (1 rule, ~200 bytes)
- Account-level rules (7-10 rules, ~2KB)
- L0 Space rules (5-8 rules, ~1.5KB)
- L1 Space rules (3-5 rules, ~1KB)
- Own rules (1-3 rules, ~500 bytes)
- **Total per entity**: ~5KB of JSONB

With 50+ entities per space sub-tree, and 45 spaces (3 L0 x 5 L1 x 3 L2), each with 50+ entities:
- ~2,250 authorization policies
- ~11MB of JSONB data per account
- ~80% of that is duplicated cascading rules

`privilegeRules` are much smaller (typically 2-5 rules per entity, ~50 bytes each) and are NOT cascaded. They contribute <5% of storage.

**Alternatives considered**:
- PostgreSQL GIN indexes on `credentialRules` for SQL-level containment queries (`@>`) — rejected: checks are in-memory after eager load (no SQL query needed), and GIN indexes add write overhead on every `saveAll()` during resets
- PostgreSQL jsonpath expressions (`@?`, `@@`) — rejected: same issue (checks are in-memory), and adds PostgreSQL-specific coupling without benefit
- TOAST strategy override (e.g., `EXTERNAL` for uncompressed out-of-line) — unnecessary: after Phase 1, local `credentialRules` will be <500 bytes (well below ~2KB TOAST threshold), staying inline automatically

---

### R5: `parentAuthorizationPolicy` Relation Usage

**Decision**: The existing `parentAuthorizationPolicy` (ManyToOne on `AuthorizationPolicy`) is already present but underutilized. It's populated only for Spaces (non-L0) to enable re-resets without parent context.

**Rationale**:
- Column exists: `parentAuthorizationPolicyId` with an index (`IDX_authorization_policy_parentAuthorizationPolicyId`)
- Currently set in `SpaceAuthorizationService.applyAuthorizationPolicy()` line 114-117: `space.authorization.parentAuthorizationPolicy = providedParentAuthorization`
- It's a ManyToOne (not eager, not cascading, SET NULL on delete)
- Most entities do NOT set this — only Spaces use it
- Note: This relation is NOT used for the Shared Inherited Rule Sets approach (Phase 1). The inherited rules are stored in a separate `InheritedCredentialRuleSet` entity with its own FK. The `parentAuthorizationPolicy` relation remains as-is for potential future use.

**Alternatives considered**:
- Using `parentAuthorizationPolicy` for chain walking at runtime — rejected per R11 (N sequential queries, not eager-loaded, no recursive loading support).

---

### R6: RabbitMQ Reset Serialization

**Decision**: Current RabbitMQ setup does NOT guarantee serialization for the same tree root. This must be addressed as part of the optimization.

**Rationale**:
- `AUTH_RESET_SERVICE` is a single queue with RMQ transport
- Events are published with `emit()` (fire-and-forget pattern, not request-response)
- The consumer (`AuthResetController`) processes events one at a time (single consumer on the queue)
- However, the queue is single-queue for ALL event types (accounts, users, orgs, platform)
- RabbitMQ's single-consumer pattern provides natural serialization at the queue level, but two reset events for the same account could be in the queue back-to-back with other events between them
- Current retry logic re-publishes to the same queue, which could interleave
- The spec requires serialization for same tree root (FR-005). The current single-consumer queue already provides this at a coarse level (only one event processed at a time).

**Alternatives considered**:
- Per-entity queues for true parallel processing — too many queues, management overhead
- Prefetch > 1 with in-app locking — adds complexity, risk of deadlocks
- **Recommendation**: Keep single-consumer queue for Phase 1 (natural serialization). For Phase 2, consider adding a deduplication/coalescing layer that merges multiple pending resets for the same root into one.

---

### R7: Elastic APM Integration Patterns

**Decision**: Use the existing `elastic-apm-node` agent and span creation pattern for authorization reset instrumentation.

**Rationale**:
- APM agent is initialized in `src/apm/apm.ts` using `elastic-apm-node`
- Spans are created via `apmAgent.currentTransaction.startSpan(name, type)`
- The `instrumentMethod()` utility in `src/apm/decorators/util/instrument.method.ts` wraps methods with APM spans
- For authorization resets, we should add spans at:
  - `AuthResetController` event handlers (transaction-level, already captured as RMQ message processing)
  - `AccountAuthorizationService.applyAuthorizationPolicy()` (span for full account reset)
  - `SpaceAuthorizationService.applyAuthorizationPolicy()` (span per space)
  - `authorizationPolicyService.saveAll()` (span for bulk save)
- Custom span labels should include: `policyCount`, `treeRootType`, `entityId`

**Alternatives considered**:
- Custom metrics endpoint — rejected per FR-012, use existing APM infrastructure
- Prometheus counters — not part of current stack

---

### R8: Batch Loading Strategy for Phase 1

**Decision**: Pre-load entire space sub-trees with a single deep-relation query, then traverse in memory without additional DB loads.

**Rationale**: TypeORM's `find()` with nested `relations` can load a full entity tree in one query (or a small number of JOINed queries). The key challenge is that `SpaceAuthorizationService.applyAuthorizationPolicy()` currently loads the space with some relations, then each child service re-loads its own entity with its own required relations.

The optimization approach:
1. In `AccountAuthorizationService.applyAuthorizationPolicy()`, load the account with ALL nested relations needed for the full reset tree in a single query
2. Pass the pre-loaded entity tree down through the traversal methods
3. Modify child `applyAuthorizationPolicy()` methods to accept pre-loaded entities instead of re-loading from DB

**Risk**: Very deep TypeORM relation loading can produce large JOINs. Mitigations:
- Use query builder with selected columns instead of full entity load
- Split into 2-3 targeted queries instead of one massive one
- Load Space sub-trees separately from the Account top-level entities

**Alternatives considered**:
- DataLoader pattern (used in the recent explore spaces optimization) — good for GraphQL resolvers but doesn't fit the top-down reset traversal pattern
- Raw SQL with CTEs — too much maintenance burden, TypeORM relations work well enough
- EntityManager `query()` with custom SELECT — considered for Phase 2 if TypeORM JOINs prove too slow

---

### R9: Intermediate Save Elimination Strategy

**Decision**: Remove all intermediate `save()` calls during tree traversal. Collect all modified `AuthorizationPolicy` objects in an array and perform a single `saveAll()` at the end.

**Rationale**: Currently, the flow is:
1. `SpaceAuthorizationService.applyAuthorizationPolicy()` saves the space's own policy (line 215-217) before propagating to children
2. Then collects child policies in `updatedAuthorizations` array
3. For subspaces, calls `applyAuthorizationPolicy()` recursively, then bulk-saves subspace authorizations (line 240-242)
4. The caller (`AuthResetController.authResetAccount()`) does a final `saveAll()` for the account-level policies

The intermediate saves are needed currently because child entities inherit from the parent's saved policy (with its `id`). But the `parentAuthorizationPolicy` reference uses the parent's `id`, which is already set before the save (TypeORM entities retain their IDs).

**Risk**: If the reset fails mid-way, no partial state is saved. This is actually acceptable per the spec's edge case: "failed branches retain their pre-reset policies" — which is exactly what happens if we don't save until the end.

**Alternatives considered**:
- Transaction-based approach (wrap entire reset in a DB transaction) — adds long-running transaction risk
- Checkpoint-based saves (save every N policies) — adds complexity without clear benefit

---

### R10: Parallel Subspace Processing Strategy

**Decision**: Use `Promise.all()` for independent subspace traversals within a single space, with bounded concurrency.

**Rationale**: Subspaces within the same parent space are independent sub-trees. Their authorization policies don't depend on each other (only on the parent). Processing them in parallel can yield significant speedups for spaces with many subspaces.

However, unbounded parallelism risks:
- Database connection pool exhaustion
- Memory pressure from loading many sub-trees simultaneously
- RabbitMQ consumer blocking

**Mitigation**: Use a concurrency limiter (e.g., process at most 5 subspaces in parallel) or use `Promise.all()` only at one level (not nested parallelism).

**Alternatives considered**:
- Worker threads — overkill for I/O-bound DB operations
- Streaming processing — doesn't fit the tree traversal pattern

---

### R11: Shared Inherited Credential Rule Sets (Replaces Delta-Only Design)

**Decision**: Deduplicate inherited cascading rules into a shared lookup table (`InheritedCredentialRuleSet`) referenced via an eager-loaded FK on `AuthorizationPolicy`. Each policy stores only local rules in its own `credentialRules` JSONB. The inherited rules are loaded via a single additional LEFT JOIN (eager FK). Each parent node owns exactly one `InheritedCredentialRuleSet` row identified by `parentAuthorizationPolicyId` FK (UNIQUE). Rows are updated in place on reset — no orphans, no garbage collection.

**Rationale — why delta-only was abandoned**:
- The original delta-only approach (R11 v1) stored only entity-local rules and walked the `parentAuthorizationPolicy` chain at runtime
- `parentAuthorizationPolicy` is `eager: false` (ManyToOne, SET NULL on delete) — not loaded automatically
- TypeORM does not support recursive relation loading, so the chain walk requires N sequential DB queries (one per ancestor level)
- For a typical L2 entity: 5 sequential queries (L2 → L1 → L0 → Account → Platform) per authorization check
- This negates the storage savings — the whole point of precomputed policies is O(1) checks

**Rationale — why shared inherited rule sets work**:
- During authorization reset, all siblings under the same parent receive identical cascading rules (confirmed in R2: `space.authorization` is passed to all subspaces)
- Each parent produces exactly one set of cascading rules. Since inherited rules contain ancestor-specific UUIDs as `resourceID`, non-siblings cannot produce identical rule sets — parent-based ownership is the natural deduplication key
- An eager-loaded ManyToOne FK on `AuthorizationPolicy` adds one LEFT JOIN to every entity load — but the lookup table has ~64 rows, so the cost is negligible
- Runtime check iterates local rules + inherited rules (already in memory) — zero additional DB queries
- The boundary between inherited and local rules is clear: `inheritParentAuthorization()` sets inherited rules via FK, `appendCredentialRules()`/`extendAuthorizationPolicyLocal()` adds local rules

**Rationale — why content hashing was rejected**:
- Content-hash deduplication (`getOrCreate()` by SHA3-256) was originally planned but abandoned
- Since inherited rules contain ancestor UUIDs as `resourceID`, non-siblings can never produce identical content
- The hash only ever matched siblings — which parent-based ownership handles directly without hashing overhead
- Parent FK lookup is simpler: `findOne({ where: { parentAuthorizationPolicyId } })` vs hash computation + lookup

**Impact on runtime check latency**:
- Before: iterate one array (`credentialRules` with inherited + local rules)
- After: iterate two arrays (`inheritedCredentialRuleSet.credentialRules` first, then `credentialRules` local)
- Total rules evaluated: identical
- Extra DB cost: zero (eager-loaded FK)
- Inherited rules evaluated first for faster early exit (larger pool, higher match probability)
- Net impact: negligible (<1% latency change)

**Migration strategy**:
1. Schema migration: create `inherited_credential_rule_set` table (with `parentAuthorizationPolicyId` FK UNIQUE), add `inheritedCredentialRuleSetId` FK column to `authorization_policy`
2. Code deployment: modified `inheritParentAuthorization()` and `isAccessGrantedForCredentials()`
3. Full authorization reset: naturally populates all `InheritedCredentialRuleSet` rows and strips inherited rules from policies
4. No complex data analysis migration needed — the reset code is the migration

**Backward compatibility during transition**:
- Null `inheritedCredentialRuleSet` FK → runtime check falls back to existing full `credentialRules`
- After full reset: all policies have FK populated, `credentialRules` contains only local rules

**Alternatives considered**:
- Delta-only with parent chain walking (original R11 v1) — rejected: N sequential DB queries per check, negates precomputed policy benefit
- Content-hash deduplication — rejected: only matches siblings (ancestor UUIDs make non-sibling content unique), parent FK is simpler
- Delta-only with request-scoped cache — partially mitigates chain walk cost, but adds cache invalidation complexity, memory pressure, and still has cold-start latency
- Computed columns / SQL views — requires significant schema refactoring, PostgreSQL-specific, hard to maintain
- Redis cache for resolved policies — adds infrastructure dependency, doesn't address storage problem

---

### R13: InheritedCredentialRuleSet Lifecycle

**Decision**: No orphan management needed. Each parent node owns exactly one `InheritedCredentialRuleSet` row, identified by `parentAuthorizationPolicyId` FK (UNIQUE). Rows are updated in place on reset — never orphaned.

**Rationale**:
- The table has stable cardinality (~64 rows, one per parent node in the authorization forest)
- On reset, the existing row for a parent is found by `parentAuthorizationPolicyId` and its `credentialRules` updated
- New rows are only created for new parent nodes (first reset after entity creation)
- Rows are only deleted when a parent entity (and its authorization policy) is deleted — the FK `ON DELETE CASCADE` from `authorization_policy` handles this

**Alternatives considered**:
- Content-hash deduplication with orphan tolerance — rejected: parent-based ownership eliminates orphans entirely
- Reference counting — unnecessary: 1:1 relationship with parent policy, no shared ownership ambiguity
- Periodic GC job — unnecessary: no orphans to collect

---

### R12: Concurrency and Correctness Guarantees

**Decision**: Maintain correctness via three mechanisms: single-consumer queue serialization, optimistic concurrency on TypeORM saves, and atomic batch saves.

**Rationale**:
- **Single-consumer queue**: RabbitMQ `AUTH_RESET` queue with single consumer ensures only one reset event is processed at a time. This prevents concurrent modifications.
- **Optimistic concurrency**: TypeORM's `save()` uses the entity's `id` for UPDATE WHERE. If two saves target the same policy, the second overwrites the first. This is acceptable because only one reset runs at a time.
- **Atomic batch save**: `saveAll()` with chunking is not transactional (each chunk is a separate `save()` call). For Phase 1, this is acceptable. For Phase 2, consider wrapping in a transaction.

**Risk**: If the server crashes mid-reset, some policies may be updated while others retain old rules. This is the current behavior and is handled by re-triggering the reset.

**Alternatives considered**:
- Database-level locking (SELECT FOR UPDATE) — adds deadlock risk
- Application-level mutex per tree root — adds complexity, needs distributed lock for multi-instance

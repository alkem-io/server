# Implementation Plan: Optimize Credential-Based Authorization

**Branch**: `036-optimize-authorization` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-optimize-authorization/spec.md`

## Summary

Optimize the Alkemio server's credential-based authorization system to reduce database storage by 80%+ and improve authorization reset performance by 5x+. The approach splits each policy's credential rules into **local** (entity-specific) and **inherited** (cascading from ancestors), deduplicating inherited rules into a shared lookup table (`InheritedCredentialRuleSet`) referenced via an eager-loaded FK. Phase 1 targets storage reduction; Phase 2 targets reset speed via batch loading, parallel subspace traversal, and intermediate save elimination.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16, RabbitMQ (amqplib), elastic-apm-node
**Storage**: PostgreSQL 17.5 — `authorization_policy` table with JSONB columns (`credentialRules`, `privilegeRules`); new `inherited_credential_rule_set` table
**Testing**: Vitest 4.x — existing authorization test suite validates behavioral equivalence (SC-003)
**Target Platform**: Linux server (Docker containers on Kubernetes)
**Project Type**: Single NestJS server project
**Performance Goals**: 5x faster authorization reset (SC-001), 80%+ storage reduction (SC-002), <10% runtime check latency increase (SC-004), global reset <30 min for ~1500 users (SC-005)
**Constraints**: Zero-downtime migration (FR-010), backward compatibility during transition (null FK fallback), no new GraphQL schema surface (FR-012)
**Scale/Scope**: ~50 entity types extending AuthorizableEntity, ~1000+ policies per medium deployment, 5 authorization forest roots, 3-level space hierarchy (L0/L1/L2)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|---|---|---|
| **1. Domain-Centric Design** | PASS | All changes are in domain services (`src/domain/common/authorization-policy/`, `src/domain/common/inherited-credential-rule-set/`). No business logic in resolvers. |
| **2. Modular NestJS Boundaries** | PASS | New `InheritedCredentialRuleSetModule` is a single-purpose module under `src/domain/common/`. Exports only `InheritedCredentialRuleSetService`. No circular dependencies. |
| **3. GraphQL Schema as Stable Contract** | PASS | No GraphQL schema changes (FR-012). `InheritedCredentialRuleSet` is internal-only, not exposed via GraphQL. |
| **4. Explicit Data & Event Flow** | PASS | Reset flow unchanged: event → consumer → tree traversal → persistence. `resolveForParent()` is called within the existing traversal flow. No new side effects. |
| **5. Observability & Operational Readiness** | PASS | Phase 2 adds Elastic APM spans for reset duration and policy count (FR-012). Uses existing `elastic-apm-node` infrastructure. Reset logging enhanced with timing and counts (FR-011). |
| **6. Code Quality with Pragmatic Testing** | PASS | Risk-based approach: existing authorization test suite validates behavioral equivalence. New unit tests for `InheritedCredentialRuleSetService.resolveForParent()` and `isAccessGrantedForCredentials()` modified logic (T028a, T028b in tasks.md). No 100% coverage mandate. |
| **7. API Consistency & Evolution** | PASS | No GraphQL surface changes. Internal method signatures change minimally (`inheritParentAuthorization()` gains async transient-field pattern). |
| **8. Secure-by-Design** | PASS | No new external inputs. Authorization correctness is the primary invariant (FR-001, SC-003). No secrets handling changes. |
| **9. Container & Deployment Determinism** | PASS | Online migration (FR-010). No new environment variables. Config via existing `authorization.chunk` setting. |
| **10. Simplicity & Incremental Hardening** | PASS | Simplest viable approach: one new entity, one new service method, one FK column. No caching layers, no CQRS, no complex indexing. Phase 2 adds parallelism only where independent subtrees exist. |

**Post-Phase 1 Design Re-check**: All principles still satisfied. The `InheritedCredentialRuleSet` entity is minimal (5 columns, ~64 rows). The eager-loaded FK adds negligible query cost. The `_childInheritedCredentialRuleSet` transient field caches the resolved set per parent object in memory, so the DB call happens once per parent regardless of child count.

**Post-Phase 3a Re-check (Centralization)**: `inheritParentAuthorization()` becomes async with internal `resolveForParent()` call. All callers are already in async contexts, so adding `await` is mechanical and safe. This eliminates the distributed `resolveForParent()` pattern (15-20 call sites) in favor of a single centralized call site — simpler, impossible to forget for new entity types.

## Project Structure

### Documentation (this feature)

```text
specs/036-optimize-authorization/
├── plan.md              # This file
├── research.md          # Phase 0: research findings (13 topics)
├── data-model.md        # Phase 1: entity model changes
├── quickstart.md        # Phase 1: setup and testing guide
├── contracts/
│   └── service-contracts.md  # Phase 1: internal service API changes
├── checklists/
│   └── requirements.md  # Requirements checklist
└── tasks.md             # Implementation tasks (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── common/
│       ├── authorization-policy/
│       │   ├── authorization.policy.entity.ts       # MODIFIED: add ManyToOne FK to InheritedCredentialRuleSet
│       │   ├── authorization.policy.interface.ts     # MODIFIED: add inheritedCredentialRuleSet + transient field
│       │   ├── authorization.policy.service.ts       # MODIFIED: inheritParentAuthorization() uses transient field
│       │   └── authorization.policy.module.ts        # MODIFIED: import InheritedCredentialRuleSetModule
│       └── inherited-credential-rule-set/            # NEW MODULE
│           ├── inherited.credential.rule.set.entity.ts
│           ├── inherited.credential.rule.set.interface.ts
│           ├── inherited.credential.rule.set.service.ts
│           └── inherited.credential.rule.set.module.ts
├── core/
│   └── authorization/
│       └── authorization.service.ts                  # MODIFIED: isAccessGrantedForCredentials() evaluates inherited + local
├── migrations/
│   └── <timestamp>-sharedInheritedRuleSets.ts        # NEW: schema migration
└── [~55 authorization service files]                  # MODIFIED: add await to inheritParentAuthorization() calls
                                                       # ~20 parent services: remove manual resolveForParent() calls (cleanup)
```

**Structure Decision**: Existing NestJS project structure. New module placed under `src/domain/common/` alongside the existing `authorization-policy/` module, following the domain-centric principle. No new top-level directories.

## Phase 1: Shared Inherited Rule Sets (Storage Reduction)

_Tasks.md maps this to Phase 1 (Setup, Step 1) + Phase 2 (Foundational, Step 2) + Phase 3 (US2 parent updates, Step 3)._

**Scope**: US2 (primary), US3 (correctness), US4 (runtime performance)
**FRs**: FR-001 through FR-008, FR-010
**SCs**: SC-002, SC-003, SC-004, SC-006

### 1.1 New Entity: InheritedCredentialRuleSet

A lightweight entity extending `BaseAlkemioEntity` with:
- `credentialRules` (JSONB, NOT NULL) — pre-merged cascading rules from the ancestor chain
- `parentAuthorizationPolicyId` (UUID, UNIQUE, NOT NULL, FK → `authorization_policy.id`, ON DELETE CASCADE)

See [data-model.md](./data-model.md) for full schema and examples.

### 1.2 New Service: InheritedCredentialRuleSetService

Single method: `resolveForParent(parentAuthorization)`:
1. Compute cascading rules from parent's local rules (cascade=true) + parent's inherited rule set
2. Find existing row by `parentAuthorizationPolicyId`
3. Update in place if found, create new if not
4. Attach to transient field on parent authorization for synchronous consumption

See [service-contracts.md](./contracts/service-contracts.md) for full contract.

### 1.3 Modified: inheritParentAuthorization()

**Phase 3 (current)**: Reads pre-resolved transient field `_childInheritedCredentialRuleSet`, falls back to copy behavior if absent. Signature stays synchronous. Requires each parent service to call `resolveForParent()` manually.

**Phase 3a (centralized refactoring)**: Becomes `async`, internally calls `resolveForParent()` when `_childInheritedCredentialRuleSet` is not already cached on the parent object:
- Checks `parentAuthorization._childInheritedCredentialRuleSet` — if present, uses cached value (no DB call)
- If absent, calls `resolveForParent(parentAuthorization)` which resolves and caches the result
- Sets `child.inheritedCredentialRuleSet = resolvedRow`
- Child's `credentialRules` left empty (local rules added later by callers)
- Fallback path removed — all callers go through the centralized path
- All ~55 callers add `await` (mechanical — all are already in async methods)
- Manual `resolveForParent()` calls removed from ~20 parent services (cleanup)

### 1.4 Modified: isAccessGrantedForCredentials()

Two-phase evaluation with inherited-first ordering:
1. Evaluate `authorization.inheritedCredentialRuleSet?.credentialRules` (larger pool, higher match probability)
2. Evaluate `authorization.credentialRules` (local rules, typically 0-3)
3. If `inheritedCredentialRuleSet` is null → evaluate `credentialRules` alone (backward compat)
4. Privilege rules unchanged

### 1.5 Caller Updates (~55 files) and Parent Service Cleanup (~20 files)

**Phase 3 (current)**: ~20 parent services individually inject `InheritedCredentialRuleSetService` and call `resolveForParent()` before child propagation. ~35 leaf services not yet updated (use fallback path).

**Phase 3a (centralized refactoring)**:
1. `AuthorizationPolicyService` injects `InheritedCredentialRuleSetService` — single injection point
2. `inheritParentAuthorization()` becomes async with internal auto-resolve
3. All ~55 callers add `await` — mechanical change, all are in async contexts
4. ~20 parent services that currently call `resolveForParent()` manually: remove those calls and the `InheritedCredentialRuleSetService` injection + module import (cleanup)
5. ~35 leaf services that were never updated: automatically covered — no changes needed
6. Fallback path in `inheritParentAuthorization()` removed entirely
7. **New entity types automatically participate** — no possibility of forgetting `resolveForParent()`

### 1.6 Schema Migration

- Create `inherited_credential_rule_set` table
- Add `inheritedCredentialRuleSetId` FK column (nullable, SET NULL) to `authorization_policy`
- Add index on `parentAuthorizationPolicyId` (UNIQUE constraint provides this)
- Down migration: drop FK constraint, column, table in reverse order

### 1.7 Migration Strategy (FR-010)

1. Deploy code with schema migration → new table + FK column created
2. Null FK = backward compatible (old credentialRules still work)
3. Trigger full authorization reset → populates all InheritedCredentialRuleSet rows, strips inherited rules from policies
4. No maintenance window required

## Phase 2: Reset Optimization (Performance)

_Tasks.md maps this to Phase 4 (US1). Phase 5 (Polish) provides cross-cutting validation of both plan phases._

**Scope**: US1 (primary), US3 (correctness), US4 (runtime performance)
**FRs**: FR-001 through FR-007, FR-009, FR-011, FR-012
**SCs**: SC-001, SC-003, SC-004, SC-005

### 2.1 Batch Entity Loading

Pre-load entire space sub-trees with single deep-relation queries. Modify `applyAuthorizationPolicy()` methods to accept pre-loaded entities via optional parameters, eliminating N+1 query patterns.

### 2.2 Intermediate Save Elimination

Remove all intermediate `save()` calls during tree traversal. Collect all modified `AuthorizationPolicy` objects and `InheritedCredentialRuleSet` rows, perform single `saveAll()` at the end.

### 2.3 Parallel Subspace Processing

Replace sequential `for...of await` with bounded `Promise.all()` for independent subspace traversals. Bounded concurrency prevents connection pool exhaustion.

### 2.4 APM Instrumentation (FR-012)

Add Elastic APM spans at:
- `AuthResetController` event handlers (transaction-level)
- `AccountAuthorizationService.applyAuthorizationPolicy()` (span for full account reset)
- `SpaceAuthorizationService.applyAuthorizationPolicy()` (span per space)
- `AuthorizationPolicyService.saveAll()` (span for bulk save)

Custom labels: `policyCount`, `treeRootType`, `entityId`, `durationMs`.

### 2.5 Enhanced Logging (FR-011)

Log at reset boundaries:
- Start/end of each tree root reset with timing
- Number of policies updated per tree
- Warnings for large batches (>500 policies)

## Behavioral Invariants

These MUST hold across both phases (see [service-contracts.md](./contracts/service-contracts.md)):

1. **Access Decision Equivalence**: `isAccessGranted()` returns identical booleans for all `(credentials, entity, privilege)` triples
2. **Reset Idempotency**: Double-reset produces identical policies
3. **Cascade Correctness**: `cascade: true` rules visible on all descendants
4. **Non-Cascade Isolation**: `cascade: false` rules visible only on the entity itself
5. **Privilege Rule Locality**: `privilegeRules` never cascaded (unchanged)
6. **Root Independence**: Resetting one tree root doesn't affect others
7. **Backward Compatibility**: Null `inheritedCredentialRuleSet` = pre-optimization behavior

## Complexity Tracking

No constitution violations to justify. The approach is the simplest viable:
- One new entity (5 columns, ~64 rows)
- One new service with one method
- One new FK column on existing table
- No new GraphQL surface
- No new infrastructure dependencies
- No caching layers, no materialized views, no computed columns

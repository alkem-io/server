# Tasks: Optimize Credential-Based Authorization

**Input**: Design documents from `/specs/036-optimize-authorization/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/service-contracts.md, research.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Behavioral equivalence is validated via the existing authorization test suite (SC-003). No new test tasks are generated.

**Organization**: Tasks follow the spec's two-phase delivery model. **Phase 1** (storage reduction via Shared Inherited Rule Sets) maps to US2 (primary) and delivers US3/US4 for its scope. **Phase 2** (reset optimization) maps to US1 (primary) and delivers US3/US4 for its scope. US3 (Correctness) and US4 (Runtime Performance) are cross-cutting quality constraints validated at checkpoints — they do not have standalone implementation phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US2 = Reduced Storage (Phase 1), US1 = Faster Reset (Phase 2)
- Include exact file paths in descriptions

---

## Phase 1: Foundational — InheritedCredentialRuleSet Module + Schema Migration

**Purpose**: Create the new shared entity module and database schema that all subsequent work depends on. No behavioral changes to the running system — just new infrastructure.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Create InheritedCredentialRuleSet entity extending BaseAlkemioEntity with `credentialRules` (JSONB, NOT NULL) and `contentHash` (VARCHAR(128), UNIQUE) fields in `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.entity.ts` (NEW)
- [ ] T002 Create InheritedCredentialRuleSetService with `computeContentHash()` (deterministic sort by rule name then criteria type+resourceID, JSON.stringify, SHA3-256 via Node crypto) and `getOrCreate()` (lookup by hash, create if not found) in `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service.ts` (NEW)
- [ ] T003 Create InheritedCredentialRuleSetModule with TypeOrmModule.forFeature([InheritedCredentialRuleSet]), export InheritedCredentialRuleSetService in `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module.ts` (NEW)
- [ ] T004 [P] Add optional `inheritedCredentialRuleSet` field (no @Field decorator — internal only, not exposed via GraphQL) to IAuthorizationPolicy abstract class in `src/domain/common/authorization-policy/authorization.policy.interface.ts`
- [ ] T005 Add ManyToOne relation to InheritedCredentialRuleSet on AuthorizationPolicy entity (eager: true, cascade: false, onDelete: 'SET NULL', optional) in `src/domain/common/authorization-policy/authorization.policy.entity.ts`
- [ ] T006 Import InheritedCredentialRuleSetModule in AuthorizationPolicyModule imports array and inject service into AuthorizationPolicyService constructor in `src/domain/common/authorization-policy/authorization.policy.module.ts`
- [ ] T007 Generate TypeORM schema migration via `pnpm run migration:generate -n SharedInheritedRuleSets` — verify it creates `inherited_credential_rule_set` table (PK, credentialRules JSONB, contentHash UNIQUE + INDEX) and adds `inheritedCredentialRuleSetId` FK column (nullable, SET NULL) to `authorization_policy`. Compare output against plan.md section 1.5 SQL. Verify the **down migration** drops FK constraint, column, and table in reverse order. Run `.scripts/migrations/run_validate_migration.sh` on a DB snapshot to validate both up and down paths. File: `src/migrations/<timestamp>-sharedInheritedRuleSets.ts` (NEW)

**Checkpoint**: New module compiles, migration runs successfully (`pnpm run migration:run`), no behavioral changes yet.

---

## Phase 2: US2 — Reduced Database Storage Footprint (Priority: P1, Spec Phase 1) MVP

**Goal**: Reduce authorization_policy table storage by 80%+ by splitting credential rules into local (entity-specific) and inherited (shared via FK). Deduplication via content hash means ~64 shared rows replace ~1000+ duplicated JSONB blobs (SC-002, SC-006).

**Independent Test**: Compare `pg_total_relation_size('authorization_policy')` before/after a full authorization reset. Run full test suite to verify identical access decisions. Create new entities and verify incremental storage is 80%+ smaller.

**Delivers**: US2 (storage reduction), US3 (correctness via unchanged tests), US4 (runtime: inherited-first evaluation reduces effective array scan, smaller JSONB stays below TOAST threshold).

### Core Storage Changes

- [ ] T008 [US2] Modify `AuthorizationPolicyService.inheritParentAuthorization()` to become async: (1) collect parent's local cascade rules + parent's inheritedCredentialRuleSet.credentialRules, (2) call `InheritedCredentialRuleSetService.getOrCreate()` with combined inherited rules, (3) set `child.inheritedCredentialRuleSet = sharedRuleSet`, (4) leave child's credentialRules empty (local rules added later by callers). Return type changes to `Promise<IAuthorizationPolicy>`. File: `src/domain/common/authorization-policy/authorization.policy.service.ts`
- [ ] T009 [US2] Update all ~50 callers of `inheritParentAuthorization()` to `await` the now-async method. Use `grep -r "inheritParentAuthorization("` to find all call sites. Callers span `src/domain/` (~35 files), `src/platform/` (~5 files), `src/library/` (~2 files), `src/services/` (~1 file), plus `src/domain/common/profile/profile.resolver.mutations.ts` and test file `src/domain/common/authorization-policy/authorization.policy.service.spec.ts`. Each caller's enclosing method should already be async — just add `await` before the call.

### Runtime Check Modification

- [ ] T010 [P] [US2] Modify `AuthorizationService.isAccessGrantedForCredentials()` to evaluate two rule sources in order: (1) `authorization.inheritedCredentialRuleSet?.credentialRules` first (inherited — larger pool, higher match probability for early exit), (2) `authorization.credentialRules` second (local only — typically 0-3 rules). Backward compat: if `inheritedCredentialRuleSet` is null, evaluate `credentialRules` alone (pre-migration behavior). File: `src/core/authorization/authorization.service.ts`

### Validation

- [ ] T011 [US2] Run full test suite (`pnpm test:ci:no:coverage`) to verify all existing authorization tests pass without modification (SC-003, FR-001). Fix any failures caused by the async signature change or dual-source evaluation. Additionally verify all 5 reset event types (account, organization, user, platform, resetAll) trigger successfully via the modified async code path (FR-004).

**Checkpoint**: US2 complete. Phase 1 can ship independently. After a full authorization reset (`reset all`), policies have `inheritedCredentialRuleSet` FK populated and `credentialRules` contains only local rules. Storage reduced by ~80% (SC-002). Runtime check unchanged in behavior (SC-003). Runtime latency unchanged or improved (SC-004).

**Deployment sequence (FR-010)**: (1) Deploy schema migration (`pnpm run migration:run` — adds table + FK column, zero behavioral change), (2) Deploy code changes (modified `inheritParentAuthorization` + `isAccessGrantedForCredentials` — backward compat: null FK falls back to existing full `credentialRules`), (3) Trigger full authorization reset (`reset all` — populates all `inheritedCredentialRuleSet` FKs, strips inherited rules from local `credentialRules`). Server remains fully operational throughout. Brief elevated DB load during step 3 is expected.

---

## Phase 3: US1 — Faster Authorization Reset for Platform Administrators (Priority: P1, Spec Phase 2)

**Goal**: Achieve 5x+ reset speed improvement by eliminating N+1 query patterns, parallelizing independent subtree traversals, removing intermediate saves, and adding APM instrumentation (SC-001, SC-005).

**Independent Test**: Trigger authorization reset on an account with 3-level space hierarchy (3 L0, 5 L1 each, 3 L2 each). Measure wall-clock time before/after. Verify no DB connection exhaustion during global reset.

**Delivers**: US1 (reset speed), US3 (correctness maintained), US4 (faster persistence means fresher policies).

### Batch Entity Loading (Eliminate N+1)

- [ ] T012 [US1] Create batch space tree loading method that loads a full space entity tree with all relations needed for authorization reset in a single deep query. Key relations: authorization, agent, community (roleSet), collaboration (calloutsSet with callouts and all callout children — framing, contributions, comments, classification, whiteboard, memo), about (profile), storageAggregator, templatesManager, subspaces, license, account. **Risk mitigation**: if the single deep JOIN produces too large a result set or exceeds query planner limits, split into 2-3 targeted queries (e.g., space+community, collaboration+callouts, about+storage) per plan.md §2.1. Add to existing `SpaceLookupService` or create a new loader method. File: `src/domain/space/space/space.service.lookup.ts` (or new file in same directory)
- [ ] T013 [P] [US1] Modify `CollaborationAuthorizationService.applyAuthorizationPolicy()` to skip re-loading collaboration entity when the passed `collaborationInput` already has all required relations loaded (check for presence of calloutsSet, innovationFlow, timeline, license relations). File: `src/domain/collaboration/collaboration/collaboration.service.authorization.ts`
- [ ] T014 [P] [US1] Modify `CalloutsSetAuthorizationService.applyAuthorizationPolicy()` to skip re-loading callouts when the passed `calloutsSetInput` already has the callouts relation loaded. File: `src/domain/collaboration/callouts-set/callouts.set.service.authorization.ts`
- [ ] T015 [P] [US1] Modify `CalloutAuthorizationService.applyAuthorizationPolicy()` to accept optional `preloadedCallout?: ICallout` parameter and skip DB load when provided (per contracts/service-contracts.md). File: `src/domain/collaboration/callout/callout.service.authorization.ts`
- [ ] T016 [P] [US1] Modify `CommunityAuthorizationService.applyAuthorizationPolicy()` to accept optional `preloadedCommunity?: ICommunity` parameter and skip DB load when provided. File: `src/domain/community/community/community.service.authorization.ts`

### Space & Account Reset Optimization

- [ ] T017 [US1] Modify `SpaceAuthorizationService.applyAuthorizationPolicy()` to accept optional `preloadedSpace?: ISpace` parameter: when provided, skip the individual DB load and use the pre-loaded entity. File: `src/domain/space/space/space.service.authorization.ts`
- [ ] T018 [US1] Replace sequential `for...of await` subspace loop with parallel processing using `Promise.all()` in `SpaceAuthorizationService.applyAuthorizationPolicy()`. Add bounded concurrency (batch of 5 subspaces) using a simple Promise-based semaphore to prevent DB connection pool exhaustion. File: `src/domain/space/space/space.service.authorization.ts`
- [ ] T019 [US1] Eliminate intermediate `save()` calls in `SpaceAuthorizationService.applyAuthorizationPolicy()` — collect all modified AuthorizationPolicy objects in an in-memory array and return for single bulk save by the root caller. Pre-compute cascading credential rules from parent once and pass to all children. File: `src/domain/space/space/space.service.authorization.ts`
- [ ] T020 [US1] Modify `AccountAuthorizationService.applyAuthorizationPolicy()` to: (1) batch-load account's space entities using the T012 loader, (2) pass pre-loaded space entities to `SpaceAuthorizationService`, (3) remove intermediate `save()` call for account.authorization, (4) consolidate all authorization policies into single bulk `saveAll()`. File: `src/domain/space/account/account.service.authorization.ts`

### APM Instrumentation & Enhanced Logging (FR-011, FR-012)

- [ ] T021 [P] [US1] Add APM span `auth-reset-account` (labels: accountId, policyCount) and structured verbose logging (message, accountId, policyCount, durationMs) to `AuthResetController.authResetAccount()` and other event handlers. File: `src/services/auth-reset/subscriber/auth-reset.controller.ts`
- [ ] T022 [P] [US1] Add APM span `auth-policies-save` (labels: count, type) to `AuthorizationPolicyService.saveAll()`. Use existing `apmAgent.currentTransaction.startSpan()` pattern. File: `src/domain/common/authorization-policy/authorization.policy.service.ts`
- [ ] T023 [P] [US1] Add APM span `auth-reset-publish-all` (labels: accountCount, userCount, orgCount) to `AuthResetService.publishResetAll()`. File: `src/services/auth-reset/publisher/auth-reset.service.ts`
- [ ] T024 [US1] Add APM span `auth-reset-space` (labels: spaceId, level, policyCount) and structured verbose logging (durationMs, policyCount, spaceId) to `SpaceAuthorizationService.applyAuthorizationPolicy()`. File: `src/domain/space/space/space.service.authorization.ts`

**Checkpoint**: US1 complete. All existing tests pass (SC-003). Reset performance shows 5x+ improvement (SC-001). Global reset completes within 30 min for ~1500 users (SC-005). Runtime check latency unchanged (SC-004).

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation of all six success criteria and edge cases.

**Edge case coverage**: Concurrent read during reset (eventual consistency via last persisted state), orphaned InheritedCredentialRuleSet rows (tolerated per research R13 — ~64 rows max), partial reset failure (failed branches retain pre-reset policies, re-trigger is idempotent), hierarchy depth (validated for 3-level per spec), concurrent privacy change during reset (serialized via RabbitMQ single-consumer queue per FR-005).

- [ ] T025 Run full test suite (`pnpm test:ci:no:coverage`) to confirm behavioral equivalence across both phases (SC-003, FR-001)
- [ ] T026 Measure `authorization_policy` table storage before/after full authorization reset to verify 80%+ reduction (SC-002). SQL: `SELECT pg_total_relation_size('authorization_policy'), pg_total_relation_size('inherited_credential_rule_set')`
- [ ] T027 Create new entities (space, callout, community member) post-optimization and measure incremental `authorization_policy` storage per entity to verify 80%+ reduction vs pre-optimization baseline (SC-006)
- [ ] T028 Perform authorization reset benchmark on account with 3-level space hierarchy (3 L0 spaces, 5 L1 each, 3 L2 each) to verify 5x+ speedup vs baseline (SC-001)
- [ ] T029 Benchmark runtime authorization check latency on representative entity set to verify within 10% of baseline (SC-004)
- [ ] T030 Validate global "reset all" completes within 30 minutes for production-scale platform (~1500 users, proportional accounts/organizations) without DB connection exhaustion or timeout errors (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. BLOCKS all user stories.
- **US2 (Phase 2 / Spec Phase 1)**: Depends on Foundational completion — delivers standalone value (80%+ storage reduction)
- **US1 (Phase 3 / Spec Phase 2)**: Depends on US2 completion — builds on shared inherited rule sets for simpler batch processing
- **Polish (Phase 4)**: Depends on US2 + US1 completion

### Within Phase 1 (Foundational)

- **T001** (entity) — start immediately
- **T002** (service) — depends on T001 (uses entity type)
- **T003** (module) — depends on T001 + T002 (registers both)
- **T004** [P] (interface) — independent, can run parallel with T001-T003
- **T005** (entity FK) — depends on T001 (references entity)
- **T006** (module import) — depends on T003 + T005
- **T007** (migration) — depends on T001 + T005 (reads entity definitions)

### Within Phase 2 (US2)

- **T008** (modify inheritParentAuthorization) — depends on T006 (module imported + service injected)
- **T009** (update ~50 callers) — depends on T008 (method is now async)
- **T010** [P] (runtime check) — independent of T008/T009 (different file), depends only on T004 (interface has new field)
- **T011** (test validation) — depends on T009 + T010

### Within Phase 3 (US1)

- **T012** (batch loader) — can start immediately after Phase 2
- **T013-T016** [P] — can run in parallel (different files), depend on knowing the pre-loaded entity pattern
- **T017** (SpaceAuth pre-load) — depends on T012 (uses loader output)
- **T018** (parallel subspaces) — depends on T017 (same file, sequential changes)
- **T019** (eliminate saves) — depends on T018 (same file)
- **T020** (AccountAuth integration) — depends on T012 + T019 (uses loader, integrates Space changes)
- **T021-T023** [P] — APM spans, independent of batch loading (different files)
- **T024** (SpaceAuth APM) — depends on T019 (same file, must come after other SpaceAuth changes)

### Parallel Opportunities

```
Phase 1 (Foundational):
  T001 (entity) ─────────────── T004 [P] (interface)
    │
    ├── T002 (service)
    │     │
    │     └── T003 (module)
    │           │
    │           └── T006 (module import)
    │
    └── T005 (entity FK) ──────── T007 (migration)

Phase 2 (US2):
  T008 (inheritParent async) ──────┐
    │                               │
    └── T009 (update 50 callers)    T010 [P] (runtime check)
              │                     │
              └─────────────────────┘
                        │
                        T011 (verify tests)

Phase 3 (US1):
  T012 (batch loader) ─────────────────────────────────────┐
    │                                                       │
    ├── T013 (Collab) ─┐                                    │
    ├── T014 (CallSet) ├── [P] different files               │
    ├── T015 (Callout) │                                    │
    └── T016 (Community)┘                                    │
                                                            ▼
  T017 → T018 → T019 → T024 (sequential, same file: space.service.authorization.ts)
                  │
                  └── T020 (AccountAuth integration)

  T021 (ResetCtrl APM) ─┐
  T022 (PolicySvc APM)  ├── [P] different files, independent
  T023 (ResetSvc APM)  ─┘
```

---

## Implementation Strategy

### MVP First (US2 Only — Spec Phase 1)

1. Complete Phase 1: Foundational (T001-T007)
2. Complete Phase 2: US2 (T008-T011)
3. **STOP and VALIDATE**: Run full test suite, trigger full authorization reset, measure storage
4. Deploy Spec Phase 1 independently — delivers 80%+ storage reduction with identical authorization behavior
5. No new infrastructure dependencies, no GraphQL schema changes, zero-downtime migration via full reset

### Full Delivery (US2 + US1)

1. Complete US2 → validate → deploy (Spec Phase 1)
2. Complete US1 (T012-T024) → validate reset performance and correctness
3. Deploy Spec Phase 2 — delivers 5x+ reset speedup on top of storage reduction
4. Complete Polish (T025-T030) → validate all six success criteria (SC-001 through SC-006)

### Suggested MVP Scope

**US2 only (T001-T011)**: 11 tasks delivering 80%+ storage reduction. This is the highest-value increment — the `authorization_policy` table currently consumes ~99% of DB storage with ~80% duplicated data. Storage reduction also improves backup times, vacuum performance, and reduces I/O for policy loading. US1 (reset optimization) builds on top and can follow in a subsequent release.

---

## Summary

| Metric | Value |
|---|---|
| Total tasks | 30 |
| Phase 1 (Foundational) | 7 tasks (T001-T007) |
| Phase 2 / US2 (Storage) | 4 tasks (T008-T011) |
| Phase 3 / US1 (Reset Speed) | 13 tasks (T012-T024) |
| Phase 4 (Polish) | 6 tasks (T025-T030) |
| Parallel opportunities | 9 tasks marked [P] across all phases |
| Files created | 4 new files (entity, service, module, migration) |
| Files modified | ~60 files (50 callers + 10 authorization services + APM/logging) |
| Cross-cutting stories | US3 (correctness) validated at T011/T025 checkpoints; US4 (runtime) delivered by T010 inherited-first evaluation |

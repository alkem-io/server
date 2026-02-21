# Tasks: Optimize Credential-Based Authorization

**Input**: Design documents from `/specs/036-optimize-authorization/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/service-contracts.md, research.md, quickstart.md

**Tests**: Behavioral equivalence is validated via the existing authorization test suite (SC-003). New unit tests are added for the two core behavioral changes: `InheritedCredentialRuleSetService.resolveForParent()` and the modified two-phase evaluation in `AuthorizationService.isAccessGrantedForCredentials()` (per plan.md Constitution Check, Principle 6).

**Organization**: Tasks follow the spec's two-phase delivery model. **Plan Phase 1** (storage reduction via Shared Inherited Rule Sets) maps to US2 (primary). **Plan Phase 2** (reset optimization) maps to US1 (primary). US3 (Correctness) and US4 (Runtime Performance) are cross-cutting quality constraints validated at checkpoints — they do not have standalone implementation phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US2 = Reduced Storage (Plan Phase 1), US1 = Faster Reset (Plan Phase 2)
- Include exact file paths in descriptions

---

## Phase 0: Baseline Capture

**Purpose**: Record pre-optimization metrics so that SC-001, SC-002, SC-004, SC-005, and SC-006 benchmarks have a reference point. Must run before any code changes.

- [ ] T000 Capture and persist pre-optimization baseline measurements: (1) `SELECT pg_total_relation_size('authorization_policy')` for storage baseline (SC-002, SC-006), (2) trigger a full authorization reset on a test account with a 3-level space hierarchy and record wall-clock duration (SC-001), (3) benchmark authorization check latency on a representative entity set (SC-004). Store results in `specs/036-optimize-authorization/baseline-metrics.md` for later comparison.

**Checkpoint**: Baseline metrics recorded. All subsequent benchmarks reference these values.

---

## Phase 1: Setup — InheritedCredentialRuleSet Module (Plan Phase 1, Step 1)

**Purpose**: Create the new shared entity module. No behavioral changes yet.

**CRITICAL**: No user story work can begin until this phase and Phase 2 are complete.

- [x] T001 [P] Create InheritedCredentialRuleSet entity extending BaseAlkemioEntity with `credentialRules` (JSONB, NOT NULL) and `parentAuthorizationPolicyId` (UUID, UNIQUE, NOT NULL, FK → authorization_policy.id, ON DELETE CASCADE) in `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.entity.ts` (NEW)
- [x] T002 [P] Create IInheritedCredentialRuleSet interface extending IBaseAlkemio with `credentialRules: AuthorizationPolicyRuleCredential[]` and `parentAuthorizationPolicyId: string` in `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.interface.ts` (NEW)
- [x] T003 Create InheritedCredentialRuleSetService with `resolveForParent(parentAuthorization: IAuthorizationPolicy): Promise<InheritedCredentialRuleSet>` — (1) compute cascading rules: `parent.credentialRules.filter(r => r.cascade)` + `parent.inheritedCredentialRuleSet?.credentialRules ?? []`, (2) `findOne({ where: { parentAuthorizationPolicyId: parent.id } })`, (3) if found → update `credentialRules` and save, (4) if not found → create with `parentAuthorizationPolicyId = parent.id` and save, (5) attach: `parent._childInheritedCredentialRuleSet = resolvedRow`, (6) return resolved row. File: `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service.ts` (NEW)
- [x] T004 Create InheritedCredentialRuleSetModule with `TypeOrmModule.forFeature([InheritedCredentialRuleSet])`, exports `InheritedCredentialRuleSetService` in `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module.ts` (NEW)

**Checkpoint**: New module compiles (`pnpm build`). No behavioral changes.

---

## Phase 2: Foundational — Core Authorization Changes (Plan Phase 1, Step 2)

**Purpose**: Schema migration + core service modifications that all parent service updates depend on.

**CRITICAL**: No Phase 3 work can begin until this phase is complete.

- [x] T005 Add ManyToOne relation to InheritedCredentialRuleSet on AuthorizationPolicy entity (`eager: true`, `cascade: false`, `onDelete: 'SET NULL'`, nullable) in `src/domain/common/authorization-policy/authorization.policy.entity.ts`
- [x] T006 [P] Add `inheritedCredentialRuleSet?: IInheritedCredentialRuleSet` field and `_childInheritedCredentialRuleSet?: InheritedCredentialRuleSet` transient field (not persisted, not GraphQL-exposed — used to pass resolved set from `resolveForParent()` to `inheritParentAuthorization()` synchronously) to IAuthorizationPolicy in `src/domain/common/authorization-policy/authorization.policy.interface.ts`
- [x] T007 Import InheritedCredentialRuleSetModule in AuthorizationPolicyModule imports array in `src/domain/common/authorization-policy/authorization.policy.module.ts`
- [ ] T008 Generate TypeORM migration via `pnpm run migration:generate -n SharedInheritedRuleSets` — verify it creates `inherited_credential_rule_set` table (PK, createdDate, updatedDate, version, credentialRules JSONB NOT NULL, parentAuthorizationPolicyId UUID UNIQUE NOT NULL FK with ON DELETE CASCADE) and adds nullable `inheritedCredentialRuleSetId` FK column (ON DELETE SET NULL) to `authorization_policy`. Verify down migration drops in reverse order. File: `src/migrations/<timestamp>-sharedInheritedRuleSets.ts` (NEW)
- [x] T009 Modify `AuthorizationPolicyService.inheritParentAuthorization()` — signature stays synchronous and unchanged. New behavior: read `parentAuthorization._childInheritedCredentialRuleSet` (pre-resolved transient field), set `child.inheritedCredentialRuleSet = resolvedRow`, leave child's `credentialRules` empty (local rules added later by callers). Fallback: if transient field is absent (null/undefined), use current copy-all-cascading-rules behavior for backward compatibility. File: `src/domain/common/authorization-policy/authorization.policy.service.ts`
- [x] T010 [P] Modify `AuthorizationService.isAccessGrantedForCredentials()` to evaluate two rule sources in order: (1) `authorization.inheritedCredentialRuleSet?.credentialRules` first (inherited — larger pool, higher match probability for early exit), (2) `authorization.credentialRules` second (local only, typically 0-3 rules). Backward compat: if `inheritedCredentialRuleSet` is null, evaluate `credentialRules` alone. Privilege rules evaluation unchanged. File: `src/core/authorization/authorization.service.ts`

**Checkpoint**: Core changes compile. Migration runs successfully (`pnpm run migration:run`). No behavioral changes until parent services call `resolveForParent()`.

---

## Phase 3: US2 — Reduced Database Storage Footprint (Plan Phase 1, Step 3) MVP

**Goal**: Reduce authorization_policy storage by 80%+ by having each parent service call `resolveForParent()` before propagating authorization to children. After a full authorization reset, policies contain only local rules with a shared FK to inherited rules.

**Independent Test**: Compare `pg_total_relation_size('authorization_policy')` before/after full reset. Run full test suite to verify identical access decisions.

**Delivers**: US2 (storage reduction), US3 (correctness via unchanged tests), US4 (runtime: inherited-first evaluation, smaller JSONB below TOAST threshold).

**Pattern for each parent service update**:
1. Inject `InheritedCredentialRuleSetService` in constructor
2. Call `await this.inheritedCredentialRuleSetService.resolveForParent(entityAuthorization)` once, AFTER the entity's own authorization is fully configured (reset + local rules applied), but BEFORE propagating to children via `inheritParentAuthorization()`
3. Update the service's NestJS module to import `InheritedCredentialRuleSetModule`

### Account & Space Tree (critical path)

- [x] T011 [US2] Add `resolveForParent()` call in AccountAuthorizationService — call after account's own authorization is configured, before propagating to spaces, agent, license, and other account children. Update AccountModule imports. File: `src/domain/space/account/account.service.authorization.ts`
- [x] T012 [US2] Add `resolveForParent()` call in SpaceAuthorizationService — call after space's own authorization is configured (reset + local space rules), before propagating to community, collaboration, storageAggregator, agent, license, templatesManager, communication, knowledgeBase, spaceAbout, and subspaces. Update SpaceModule imports. File: `src/domain/space/space/space.service.authorization.ts`

### Collaboration Subtree

- [x] T013 [P] [US2] Add `resolveForParent()` call in CollaborationAuthorizationService — call before propagating to calloutsSet, innovationFlow, timeline, license, and links children. Update CollaborationModule imports. File: `src/domain/collaboration/collaboration/collaboration.service.authorization.ts`
- [x] T014 [P] [US2] Add `resolveForParent()` call in CalloutsSetAuthorizationService — call before propagating to individual callouts. Update CalloutsSetModule imports. File: `src/domain/collaboration/callouts-set/callouts.set.service.authorization.ts`
- [x] T015 [P] [US2] Add `resolveForParent()` call in CalloutAuthorizationService — call before propagating to contributions, framing, room (comments), and classification children. Update CalloutModule imports. File: `src/domain/collaboration/callout/callout.service.authorization.ts`
- [x] T016 [P] [US2] Add `resolveForParent()` call in InnovationFlowAuthorizationService — call before propagating to InnovationFlowState children. Update InnovationFlowModule imports. File: `src/domain/collaboration/innovation-flow/innovation.flow.service.authorization.ts`

### Community Subtree

- [x] T017 [P] [US2] Add `resolveForParent()` call in CommunityAuthorizationService — call before propagating to roleSet, userGroups, communityGuidelines, userSettings, invitations, and applications children. Update CommunityModule imports. File: `src/domain/community/community/community.service.authorization.ts`

### Template Subtree

- [x] T018 [P] [US2] Add `resolveForParent()` call in TemplatesManagerAuthorizationService — call before propagating to templatesSet child. Update TemplatesManagerModule imports. File: `src/domain/template/templates-manager/templates.manager.service.authorization.ts`
- [x] T019 [P] [US2] Add `resolveForParent()` call in TemplatesSetAuthorizationService — call before propagating to individual template children. Update TemplatesSetModule imports. File: `src/domain/template/templates-set/templates.set.service.authorization.ts`

### Storage Subtree

- [x] T020 [P] [US2] Add `resolveForParent()` call in StorageAggregatorAuthorizationService — call before propagating to storageBucket children. Update StorageAggregatorModule imports. File: `src/domain/storage/storage-aggregator/storage.aggregator.service.authorization.ts`
- [x] T021 [P] [US2] Add `resolveForParent()` call in StorageBucketAuthorizationService — call before propagating to document children. Update StorageBucketModule imports. File: `src/domain/storage/storage-bucket/storage.bucket.service.authorization.ts`

### Timeline Subtree

- [x] T022 [P] [US2] Add `resolveForParent()` call in TimelineAuthorizationService — call before propagating to calendar and event children. Update TimelineModule imports. File: `src/domain/timeline/timeline/timeline.service.authorization.ts`

### Communication Subtree

- [x] T023 [P] [US2] Add `resolveForParent()` call in CommunicationAuthorizationService — call before propagating to room children. Update CommunicationModule imports. File: `src/domain/communication/communication/communication.service.authorization.ts`

### Platform Tree

- [x] T024 [P] [US2] Add `resolveForParent()` call in PlatformAuthorizationPolicyService — this is the root-level service using `inheritRootAuthorizationPolicy()`. Call `resolveForParent()` on the platform authorization before any child service inherits from it. Update PlatformAuthorizationModule imports. File: `src/platform/authorization/platform.authorization.policy.service.ts`
- [x] T025 [P] [US2] Add `resolveForParent()` call in ForumAuthorizationService — call before propagating to discussion children. Update ForumModule imports. File: `src/platform/forum/forum.service.authorization.ts`
- [x] T026 [P] [US2] Add `resolveForParent()` call in LibraryAuthorizationService — call before propagating to innovationPack children. Update LibraryModule imports. File: `src/library/library/library.service.authorization.ts`

### Remaining Parent Propagation Sites

_Definitive enumeration (audited via `grep -r "inheritParentAuthorization(" src/` cross-referenced with services passing their own authorization to children):_

- [x] T027a [P] [US2] Add `resolveForParent()` call in ProfileAuthorizationService — call before propagating to References, Tagsets, Visuals, and StorageBucket children. Update ProfileModule imports. File: `src/domain/common/profile/profile.service.authorization.ts`
- [x] T027b [P] [US2] Add `resolveForParent()` call in WhiteboardAuthorizationService — call before propagating to Profile child. Update WhiteboardModule imports. File: `src/domain/common/whiteboard/whiteboard.service.authorization.ts`
- [x] T027c [P] [US2] Add `resolveForParent()` call in SpaceAboutAuthorizationService — call before propagating to Profile child (if SpaceAbout passes its own authorization to children). Update SpaceAboutModule imports. File: `src/domain/space/space.about/space.about.service.authorization.ts`
- [x] T027d [P] [US2] Add `resolveForParent()` call in CalloutFramingAuthorizationService — call before propagating to Whiteboard and Profile children (if CalloutFraming passes its own authorization to children). Update CalloutFramingModule imports. File: `src/domain/collaboration/callout-framing/callout.framing.service.authorization.ts`
- [x] T027e [P] [US2] Add `resolveForParent()` call in TemplateAuthorizationService — call before propagating to child entities (if Template passes its own authorization to children). Update TemplateModule imports. File: `src/domain/template/template/template.service.authorization.ts`
- [x] T027f [P] [US2] Add `resolveForParent()` call in KnowledgeBaseAuthorizationService — call before propagating to child entities (if KnowledgeBase passes its own authorization to children). Update KnowledgeBaseModule imports. File: `src/domain/common/knowledge-base/knowledge.base.service.authorization.ts`
- [x] T027g [P] [US2] Add `resolveForParent()` call in LicensingFrameworkAuthorizationService — call before propagating to LicensePolicy children (if LicensingFramework passes its own authorization to children). Update LicensingFrameworkModule imports. File: `src/platform/licensing/credential-based/licensing-framework/licensing.framework.service.authorization.ts`

_Note: T027c-T027g require implementation-time verification that the service actually passes its OWN authorization (not the parent's) to children. If a service merely forwards the received parent authorization without adding local rules first, it does not need `resolveForParent()`. Skip and mark as N/A in that case._

### Unit Tests (Principle 6 — signal-delivering tests for core behavioral changes)

- [x] T028a [P] [US2] Write unit tests for `InheritedCredentialRuleSetService.resolveForParent()`: (1) creates new row when none exists for parent, (2) updates existing row in place on re-reset, (3) attaches resolved row to `_childInheritedCredentialRuleSet` transient field, (4) correctly merges parent's local cascading rules + parent's inherited rules. File: `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service.spec.ts` (NEW)
- [x] T028b [P] [US2] Write unit tests for modified `AuthorizationService.isAccessGrantedForCredentials()`: (1) evaluates inherited rules first, then local rules, (2) returns on first match (early exit from inherited pool), (3) backward compat — null `inheritedCredentialRuleSet` evaluates `credentialRules` alone, (4) privilege rules unchanged. File: `src/core/authorization/authorization.service.spec.ts` (NEW or extend existing)

### Validation

- [x] T028c [US2] Verify build succeeds with no type errors — `pnpm build`
- [x] T029 [US2] Run full test suite (`pnpm test:ci:no:coverage`) to verify all existing authorization tests pass without modification (SC-003, FR-001)
- [ ] T029a [US2] Spot-check runtime authorization check latency on a representative entity set against T000 baseline to verify within 10% (SC-004). This catches regressions before Phase 4 begins.
- [ ] T029b [US2] Validate FR-010 zero-downtime migration sequence on a test environment: (1) deploy schema migration only — verify null FK backward compatibility (authorization checks work with full `credentialRules`), (2) deploy code changes — verify backward compat still holds, (3) trigger full authorization reset — verify `inheritedCredentialRuleSetId` FKs populated and `credentialRules` contains only local rules. Reference the three states from data-model.md backward compatibility table.

**Checkpoint**: US2 complete — Plan Phase 1 can ship independently. After a full authorization reset (`reset all`), policies have `inheritedCredentialRuleSet` FK populated and `credentialRules` contains only local rules. Storage reduced by ~80% (SC-002). Runtime check behavior unchanged (SC-003). Runtime latency unchanged or improved (SC-004).

**Deployment sequence (FR-010)**: (1) Deploy schema migration — adds table + FK column, zero behavioral change. (2) Deploy code changes — backward compat: null FK falls back to existing full `credentialRules`. (3) Trigger full authorization reset — populates all `inheritedCredentialRuleSet` FKs, strips inherited rules from local `credentialRules`. Server remains operational throughout.

**Implicit FR coverage note**: FR-004 (reset triggers per account/org/user/platform/global), FR-005 (concurrent reset serialization via RabbitMQ single-consumer queues), and FR-007 (visibility layer READ_ABOUT filtering) are maintained via existing unchanged behavior. These are validated implicitly by the existing test suite at T029 — no dedicated tasks required.

---

## Phase 4: US1 — Faster Authorization Reset for Platform Administrators (Plan Phase 2)

**Goal**: Achieve 5x+ reset speed improvement via batch entity loading (eliminate N+1), parallel subspace processing, intermediate save elimination, and APM instrumentation (SC-001, SC-005).

**Independent Test**: Trigger authorization reset on account with 3 L0 spaces x 5 L1 x 3 L2. Measure wall-clock time before/after. Verify no DB connection exhaustion during global reset.

**Delivers**: US1 (reset speed), US3 (correctness maintained), US4 (faster persistence → fresher policies).

### Batch Entity Loading (Eliminate N+1)

- [ ] T030 [US1] Create batch space tree loading method that pre-loads a full space entity tree with all authorization-relevant relations in a single deep query (or 2-3 targeted queries if the single query exceeds 15 JOINs or returns >50 columns — profile both approaches and pick the faster one). Key relations: authorization, agent.authorization, community (roleSet, userGroups, communityGuidelines, userSettings), collaboration (calloutsSet with callouts and all callout children), about (profile), storageAggregator (storageBuckets with documents), templatesManager, subspaces (recursive for L1/L2), license, communication. File: `src/domain/space/space/space.service.lookup.ts` (new method or dedicated loader)
- [ ] T031 [US1] Modify `SpaceAuthorizationService.applyAuthorizationPolicy()` to accept optional `preloadedSpace?: ISpace` parameter — when provided, skip the individual DB load and use the pre-loaded entity tree. Pass pre-loaded child entities down to child authorization services. File: `src/domain/space/space/space.service.authorization.ts`
- [ ] T032 [P] [US1] Modify `CollaborationAuthorizationService.applyAuthorizationPolicy()` to skip re-loading collaboration entity when it already has all required relations loaded (calloutsSet, innovationFlow, timeline, license). File: `src/domain/collaboration/collaboration/collaboration.service.authorization.ts`
- [ ] T033 [P] [US1] Modify `CalloutsSetAuthorizationService.applyAuthorizationPolicy()` to skip re-loading callouts when the calloutsSet already has the callouts relation loaded. File: `src/domain/collaboration/callouts-set/callouts.set.service.authorization.ts`
- [ ] T034 [P] [US1] Modify `CalloutAuthorizationService.applyAuthorizationPolicy()` to accept optional `preloadedCallout?: ICallout` parameter and skip DB load when provided. File: `src/domain/collaboration/callout/callout.service.authorization.ts`
- [ ] T035 [P] [US1] Modify `CommunityAuthorizationService.applyAuthorizationPolicy()` to accept optional `preloadedCommunity?: ICommunity` parameter and skip DB load when provided. File: `src/domain/community/community/community.service.authorization.ts`

### Intermediate Save Elimination

- [ ] T036 [US1] Eliminate intermediate `save()` calls in `SpaceAuthorizationService.applyAuthorizationPolicy()` — collect all modified AuthorizationPolicy objects and InheritedCredentialRuleSet rows in arrays, return for single bulk save by root caller. File: `src/domain/space/space/space.service.authorization.ts`
- [ ] T037 [P] [US1] Eliminate intermediate `save()` calls in `CollaborationAuthorizationService.applyAuthorizationPolicy()` — return all policies for bulk save. File: `src/domain/collaboration/collaboration/collaboration.service.authorization.ts`
- [ ] T038 [P] [US1] Eliminate intermediate `save()` calls in `CommunityAuthorizationService.applyAuthorizationPolicy()` — return all policies for bulk save. File: `src/domain/community/community/community.service.authorization.ts`

### Parallel Subspace Processing

- [ ] T039 [US1] Replace sequential `for...of await` subspace loop with bounded `Promise.all()` for independent subspace traversals in `SpaceAuthorizationService.applyAuthorizationPolicy()`. Use concurrency limit of 5 subspaces via simple batching to prevent DB connection pool exhaustion. File: `src/domain/space/space/space.service.authorization.ts`

### Account Tree Root Integration

- [ ] T040 [US1] Modify `AccountAuthorizationService.applyAuthorizationPolicy()` to: (1) batch-load account's space entities using T030 loader, (2) pass pre-loaded spaces to SpaceAuthorizationService, (3) remove intermediate `save()` for account.authorization, (4) consolidate all collected AuthorizationPolicy objects and InheritedCredentialRuleSet rows into single bulk `saveAll()` at the end. File: `src/domain/space/account/account.service.authorization.ts`

### APM Instrumentation & Enhanced Logging (FR-011, FR-012)

- [ ] T041 [P] [US1] Add Elastic APM span `auth-reset-account` (labels: accountId, policyCount, durationMs) and structured verbose logging (start/end timing, policy count) to `AuthResetController.authResetAccount()`. Add similar spans for other event handlers (authResetUser, authResetOrganization, authResetPlatform, authResetAiServer). File: `src/services/auth-reset/subscriber/auth-reset.controller.ts`
- [ ] T042 [P] [US1] Add APM span `auth-policies-save` (labels: count, chunkSize) and large batch warning log (>500 policies) to `AuthorizationPolicyService.saveAll()`. Use existing `apmAgent.currentTransaction?.startSpan()` pattern. File: `src/domain/common/authorization-policy/authorization.policy.service.ts`
- [ ] T043 [P] [US1] Add APM span `auth-reset-space` (labels: spaceId, level, policyCount, durationMs) and structured verbose logging (start/end, policy count) to `SpaceAuthorizationService.applyAuthorizationPolicy()`. File: `src/domain/space/space/space.service.authorization.ts`
- [ ] T044 [P] [US1] Add APM span `auth-reset-publish-all` (labels: accountCount, userCount, orgCount) to `AuthResetService.publishResetAll()`. File: `src/services/auth-reset/publisher/auth-reset.service.ts`

### Validation

- [ ] T045 [US1] Verify build succeeds (`pnpm build`) and run full test suite (`pnpm test:ci:no:coverage`) to confirm behavioral equivalence after all reset optimizations (SC-003)

**Checkpoint**: US1 complete. Reset performance shows 5x+ improvement (SC-001). Global reset completes within 30 min for ~1500 users (SC-005). All existing tests pass (SC-003).

---

## Phase 5: Polish & Cross-Cutting Validation

**Purpose**: End-to-end validation of all six success criteria, edge case verification, and deployment readiness.

**Edge case coverage**: Concurrent read during reset (eventual consistency via last persisted state), orphaned InheritedCredentialRuleSet rows (none — parent FK ownership, ~64 rows, updated in place per R13), partial reset failure (failed branches retain pre-reset policies, re-trigger is idempotent), hierarchy depth (validated for 3-level per spec), concurrent privacy change during reset (serialized via RabbitMQ single-consumer queue per FR-005).

- [ ] T046 Run full test suite (`pnpm test:ci:no:coverage`) to confirm behavioral equivalence across both plan phases (SC-003, FR-001). _Note: confirmatory gate — if no code changed between Phase 4 validation (T045) and this task, a pass is expected. The value is catching any Phase 5 polish regressions._
- [ ] T047 Measure `authorization_policy` table storage against T000 baseline to verify 80%+ reduction (SC-002). SQL: `SELECT pg_total_relation_size('authorization_policy'), pg_total_relation_size('inherited_credential_rule_set')`. Compare with baseline from `specs/036-optimize-authorization/baseline-metrics.md`.
- [ ] T048 Create new entities (space, callout, community member) post-optimization and measure incremental `authorization_policy` storage per entity to verify 80%+ reduction vs T000 pre-optimization baseline (SC-006)
- [ ] T049 Perform authorization reset benchmark on account with 3-level space hierarchy (3 L0 spaces, 5 L1 each, 3 L2 each) to verify 5x+ speedup vs T000 baseline (SC-001)
- [ ] T050 Benchmark runtime authorization check latency on representative entity set to verify within 10% of T000 baseline (SC-004)
- [ ] T051 Validate global "reset all" completes within 30 minutes for production-scale platform (~1500 users) without DB connection exhaustion or timeout errors (SC-005)
- [ ] T052 Run quickstart.md manual verification per `specs/036-optimize-authorization/quickstart.md`
- [ ] T053 Validate partial reset failure recovery (edge case from spec): trigger authorization reset, simulate mid-traversal failure (e.g., kill the consumer process mid-reset), verify failed branches retain pre-reset policies, re-trigger the same reset, verify idempotent completion with correct final state

---

## Dependencies & Execution Order

### Phase Dependencies

- **Baseline (Phase 0)**: No dependencies — run first, before any code changes
- **Setup (Phase 1 / Plan Phase 1, Step 1)**: Depends on Phase 0 — start after baseline captured
- **Foundational (Phase 2 / Plan Phase 1, Step 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US2 (Phase 3 / Plan Phase 1, Step 3)**: Depends on Phase 2 completion — delivers standalone value (80%+ storage reduction)
- **US1 (Phase 4 / Plan Phase 2)**: Depends on Phase 3 completion — builds on shared inherited rule sets
- **Polish (Phase 5)**: Depends on Phase 3 + Phase 4 completion

### Within Phase 0 (Baseline)

- **T000** — run first, no dependencies

### Within Phase 1 (Setup)

- **T001** [P] (entity) — start immediately after T000
- **T002** [P] (interface) — start immediately, parallel with T001
- **T003** (service) — depends on T001 + T002 (uses entity and interface types)
- **T004** (module) — depends on T001 + T003 (registers entity and provides service)

### Within Phase 2 (Foundational)

- **T005** (entity FK) — depends on T001 (references InheritedCredentialRuleSet entity)
- **T006** [P] (interface) — depends on T002 (references IInheritedCredentialRuleSet)
- **T007** (module import) — depends on T004 + T005
- **T008** (migration) — depends on T001 + T005 (reads entity definitions)
- **T009** (inheritParentAuthorization) — depends on T005 + T006 (reads new fields)
- **T010** [P] (isAccessGrantedForCredentials) — depends on T006 only (reads interface field)

### Within Phase 3 (US2)

- **T011** (AccountAuth) — depends on T009 (core method must be modified first)
- **T012** (SpaceAuth) — depends on T009
- **T013-T027g** [P] — can run in parallel after T009 (different files, same pattern)
- **T028a-T028b** [P] (unit tests) — can run in parallel with T013-T027g (different files)
- **T028c** (build) — depends on all T011-T027g + T028a-T028b
- **T029** (tests) — depends on T028c
- **T029a** (latency spot-check) — depends on T029 (needs working build + passing tests)
- **T029b** (migration validation) — depends on T029 (needs working build)

### Within Phase 4 (US1)

- **T030** (batch loader) — can start immediately after Phase 3
- **T031** (SpaceAuth preload) — depends on T030 (uses loader)
- **T032-T035** [P] — can run in parallel (different files), independent of T030
- **T036** (SpaceAuth save elim) — depends on T031 (same file, sequential)
- **T037-T038** [P] — can run in parallel (different files)
- **T039** (parallel subspaces) — depends on T036 (same file, sequential)
- **T040** (AccountAuth integration) — depends on T030 + T039 (uses loader, integrates Space changes)
- **T041-T044** [P] — APM spans, independent of batch loading (different files)
- **T045** (validation) — depends on all T030-T044

### Parallel Opportunities

```
Phase 0 (Baseline):
  T000 (capture metrics)

Phase 1 (Setup):
  T001 (entity) ────────── T002 (interface)
    │                         │
    └─── T003 (service) ─────┘
           │
           T004 (module)

Phase 2 (Foundational):
  T005 (entity FK) ──── T006 [P] (interface)
    │         │            │
    │         T008 (migration)
    │                      │
    T007 (module) ─────── T009 (inheritParent) ─── T010 [P] (isAccessGranted)

Phase 3 (US2) — after T009:
  T011 (Account) ─┐
  T012 (Space)    │
  T013 (Collab)   │
  T014 (CallSet)  │
  T015 (Callout)  ├── all [P] (different files, same pattern)
  T016 (InnoFlow)  │
  T017 (Community) │
  T018-T027g (rest)┘
  T028a (resolveForParent tests) ─┐  [P] (independent test files)
  T028b (isAccessGranted tests)  ─┘
         │
    T028c (build) → T029 (tests) → T029a (latency) → T029b (migration)

Phase 4 (US1):
  T030 (batch loader) ──────────────────────────────┐
    │                                                │
    ├── T032 (Collab) ─┐                             │
    ├── T033 (CallSet) ├── [P] different files        │
    ├── T034 (Callout) │                             │
    └── T035 (Commun.) ┘                             │
                                                     ▼
  T031 (Space preload) → T036 (save elim) → T039 (parallel) → T040 (Account)
                          T037 [P] (Collab saves)
                          T038 [P] (Community saves)

  T041 (ResetCtrl APM)  ─┐
  T042 (PolicySvc APM)   ├── [P] independent of batch loading
  T043 (SpaceAuth APM)   │
  T044 (ResetSvc APM)   ─┘
                │
           T045 (validation)

Phase 5 (Polish):
  T046-T053 — sequential validation gates
```

---

## Implementation Strategy

### MVP First (US2 Only — Plan Phase 1)

1. Complete Phase 0: Baseline (T000)
2. Complete Phase 1: Setup (T001-T004)
3. Complete Phase 2: Foundational (T005-T010)
4. Complete Phase 3: US2 parent service updates + tests (T011-T029b)
5. **STOP and VALIDATE**: Run full test suite, trigger full authorization reset, measure storage, validate migration sequence
6. Deploy Plan Phase 1 independently — delivers 80%+ storage reduction with identical authorization behavior
7. No new infrastructure dependencies, no GraphQL schema changes, zero-downtime migration

### Full Delivery (US2 + US1)

1. Complete US2 → validate → deploy (Plan Phase 1)
2. Complete US1 (T030-T045) → validate reset performance and correctness
3. Deploy Plan Phase 2 — delivers 5x+ reset speedup on top of storage reduction
4. Complete Polish (T046-T053) → validate all six success criteria + edge cases

### Suggested MVP Scope

**US2 only (T000-T029b)**: ~39 tasks delivering 80%+ storage reduction. The `authorization_policy` table currently consumes ~99% of DB storage with ~80% duplicated data. Storage reduction improves backup times, vacuum performance, and reduces I/O. US1 (reset optimization) builds on top and can follow in a subsequent release.

---

## Summary

| Metric | Value |
|---|---|
| Total tasks | 64 |
| Phase 0 (Baseline) | 1 task (T000) |
| Phase 1 (Setup) | 4 tasks (T001-T004) |
| Phase 2 (Foundational) | 6 tasks (T005-T010) |
| Phase 3 / US2 (Storage) | 29 tasks (T011-T029b): 16 parent services + 7 remaining audit + 2 unit tests + 4 validation |
| Phase 4 / US1 (Reset Speed) | 16 tasks (T030-T045) |
| Phase 5 (Polish) | 8 tasks (T046-T053) |
| Parallel opportunities | 34 tasks marked [P] across phases 1-4 |
| Files created | 7 new files (entity, interface, service, module, migration, 2 test files) |
| Files modified | ~25 files (20+ parent services + 5 core authorization files) |
| MVP scope (US2) | 40 tasks (T000-T029b) — standalone Plan Phase 1 delivery |
| Cross-cutting stories | US3 (correctness) validated at T029/T045/T046; US4 (runtime) at T010/T029a/T050 |
| Independent test per story | US2: storage comparison vs T000 baseline; US1: reset duration vs T000 baseline |

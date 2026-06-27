---
description: "Task list for Optimize Space Authorization Reset"
---

# Tasks: Optimize Space Authorization Reset

**Input**: Design documents from `/specs/105-optimize-auth-reset/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/authorization-load-contract.md, quickstart.md

**Tests**: Included — FR-011 mandates a permanent automated policy-equivalence regression check. It is a blocking safety net (Phase 2), not optional.

> **Implementation status (2026-06-27, partial — verified-safe slice applied)**: Six verified-safe trims applied during `/speckit-implement`, each confirmed against real code (child re-fetches by id) and validated (tsc clean, biome clean, 42/42 unit specs pass):
> 1. Callout `framing` deep-load → `framing: true`
> 2. Template `callout` deep-load → `callout: true`
> 3. Template `contentSpace.authorization` → `contentSpace: true`
> 4. Space `storageAggregator` deep-load → `storageAggregator: true`
> 5. Space `collaboration.authorization` → `collaboration: true`
> 6. TemplatesManager `templatesSet.authorization` → `templatesSet: true`
> 7. TemplatesSet `templates` → id-only via `loadEagerRelations:false` + `select` (stops hydrating every template's full eager graph; template service re-fetches by id) — uses the codebase's proven `authorizationSelectOptions` pattern (also used by Profile/Contribution/Whiteboard/Framing, which were already optimized in prior work)
>
> **Key discovery — "consume vs re-fetch":** a child taking `id: string` RE-FETCHES (parent load trimmable); a child taking the entity OBJECT often CONSUMES it (NOT trimmable). Verified consumers (do NOT trim their parent's load): storage bucket/document (`documents.tagset`), **license** (`license.authorization`), calendar **events**, community **groups**/**communication**, **templateDefaults**. Verified re-fetchers (trimmed): framing, callout, contentSpace, storageAggregator, collaboration, templatesSet.
>
> **Three design errors corrected in research.md/data-model.md** (all found by reading real code): (a) `callout.contributionDefaults` used by init guard — do NOT drop; (b) storage `documents.tagset` consumed downstream — out of scope; (c) Space `license.authorization` consumed by license service — do NOT trim.
>
> **Still pending (need seeded-DB equivalence safety net T004–T006 first):** the `select`-requiring callout trims (`contributions`/`classification` → id-only) and the large-space perf measurement (T018/T023).

**Organization**: Tasks grouped by user story. The core change is one body of work (trim the relation loads in each authorization service); the user stories are the validation lenses that prove it (US1 = completes on large spaces, US2 = access unchanged, US3 = scales with entity count).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3
- All paths are repo-relative.

## Reference

The minimal-load matrix per service is **data-model.md**; the load rules (C-1…C-7) are **contracts/authorization-load-contract.md**. Each trim task MUST conform to that matrix and carry an inline optimization comment (C-6 / Constitution Principle 5).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fixtures and measurement needed to validate every story.

- [ ] T001 Identify/seed a representative space fixture exercising every in-scope entity type (multiple callouts; post/whiteboard/link/memo/collabora contributions; community + role set + groups; storage with documents+tagsets; L0 templates; timeline/calendar with events; ≥1 nested subspace) in `test/` fixtures or seed script
- [ ] T002 [P] Add measurement scaffolding (TypeORM query logging / APM spans + peak-heap capture) around `applyAuthorizationPolicy` for before/after comparison, documented in `specs/105-optimize-auth-reset/quickstart.md`
- [ ] T003 [P] Snapshot current schema to `tmp/prev.schema.graphql` (`pnpm run schema:print && pnpm run schema:sort`) so `pnpm run schema:diff` can prove no API drift (FR-010)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The policy-equivalence safety net. **MUST exist and pass on the unchanged code before any trim begins** — it is what guarantees the trims don't alter access (FR-004, SC-002, FR-011).

**⚠️ CRITICAL**: No trimming (Phase 3) may start until T004–T006 are complete and green against unmodified code.

- [ ] T004 Implement a policy-serialization helper that, given a space, recomputes authorization and serializes each entity's policy (credential rules + privilege rules, keyed by entity id) into a stable, comparable form, in `test/utils/authorization-policy-snapshot.ts`
- [ ] T005 Capture the baseline policy snapshot for the T001 fixture from the **current (pre-trim)** code and commit it as the regression baseline under `specs/105-optimize-auth-reset/` or `test/__fixtures__/`
- [ ] T006 Add the permanent equivalence regression spec `src/domain/space/space/space.service.authorization.equivalence.spec.ts` asserting recomputed policies for the fixture equal the T005 baseline across all entity types (FR-011); confirm it passes on unmodified code

**Checkpoint**: Safety net green on unchanged code → trimming can begin.

---

## Phase 3: User Story 1 - Reset completes for the largest spaces (Priority: P1) 🎯 MVP

**Goal**: Reduce per-entity data loading so the largest spaces reset without OOM/timeout (SC-001, SC-003, SC-004), with policies unchanged (guarded by T006).

**Independent Test**: Trigger a full reset on the large fixture; it completes (no OOM/timeout) in < 5 minutes and rows-loaded/peak-heap drop by an order of magnitude vs the T002 baseline.

> Each trim below: apply the data-model.md verdicts (drop / id-only / keep), add an inline optimization comment (C-6), then re-run T006 — it MUST stay green. Trims touch different files and are parallelizable.

- [~] T007 [P] [US1] Trim Space load — **PARTIAL**: ✅ `storageAggregator` and `collaboration` nested `.authorization` dropped (children re-fetch by id). KEEP `license.authorization` (license service CONSUMES it — corrected), `community.roleSet` (used directly), `parentSpace`/`account` (used), `subspaces`/`templatesManager`/`about`/`profile` (already id-only/minimal). In `src/domain/space/space/space.service.authorization.ts`
- [~] T008 [P] [US1] Trim Callout load — **PARTIAL**: ✅ `framing` deep-load → `framing: true` applied. ⏳ Remaining (need root-`select` + equivalence test): `contributions`/`classification` → id-only, `comments` → auth-only, `contributionDefaults` → id-only (NOT drop — used by init guard). KEEP `calloutsSet→…→community.roleSet`. In `src/domain/collaboration/callout/callout.service.authorization.ts`
- [ ] T009 [P] [US1] Trim CalloutsSet load (`callouts` → id-only) in `src/domain/collaboration/callouts-set/callouts.set.service.authorization.ts`
- [~] T010 [P] [US1] Trim Template load — **PARTIAL**: ✅ `callout` deep-load → `callout: true` and `contentSpace.authorization` → `contentSpace: true` applied (biggest waste removed). ⏳ Remaining (verify child first): `communityGuidelines.profile` drop. `whiteboard` kept (one-row, needed by guard+id). In `src/domain/template/template/template.service.authorization.ts`
- [X] T011 [P] [US1] Trim TemplatesManager + TemplatesSet — **DONE**: ✅ TemplatesManager `templatesSet.authorization` dropped (re-fetches by id); ✅ TemplatesSet `templates` → id-only via `loadEagerRelations:false`+`select` (high-value: stops loading every template's eager graph). KEEP `templateDefaults.authorization` (templateDefault service CONSUMES the passed object — corrected). Files: `templates.manager.service.authorization.ts`, `templates.set.service.authorization.ts`
- [⊘] T012 [P] [US1] Trim StorageAggregator load — **CANCELLED (out of scope)**: ⚠️ design error corrected — the StorageBucket auth service does NOT re-fetch; it consumes the aggregator-loaded `documents`+`tagset` and passes them to the Document service (`storage.bucket.service.authorization.ts:26,51`). Dropping this load breaks the storage cascade. Leave as-is unless the bucket service is refactored to re-fetch. File: `src/domain/storage/storage-aggregator/storage.aggregator.service.authorization.ts`
- [⊘] T013 [P] [US1] Community load — **REVIEWED, NO SAFE TRIM**: `groups` and `communication` are passed as whole objects to children that CONSUME them (not re-fetchers); `roleSet` is used directly for credential rules. Nothing trimmable without refactoring the child services. File: `src/domain/community/community/community.service.authorization.ts`
- [⊘] T014 [P] [US1] Timeline + Calendar — **REVIEWED, ALREADY MINIMAL**: Timeline loads only `calendar: true` (one row; calendar service re-fetches). Calendar loads `events: true` (event rows only) and passes each whole event to a CONSUMER child — already minimal and required. No safe trim. Files: `timeline.service.authorization.ts`, `calendar.service.authorization.ts`
- [ ] T015 [P] [US1] Trim InnovationFlow load (`profile` → id-only; keep `states`) in `src/domain/collaboration/innovation-flow/innovation.flow.service.authorization.ts`
- [⊘] T016 [P] [US1] Collaboration load — **REVIEWED, NO CLEAN TRIM**: `calloutsSet`/`timeline` already one-row (children re-fetch); `license.entitlements` consumed by license service; `innovationFlow.profile` only used by an init guard (one row, not worth guard churn). No safe no-`select` trim. File: `src/domain/collaboration/collaboration/collaboration.service.authorization.ts`
- [ ] T017 [P] [US1] Minor cleanup: pass `post.id` rather than the full `post` object to PostAuthorizationService (already-selective load retained) in `src/domain/collaboration/callout-contribution/callout.contribution.service.authorization.ts`
- [ ] T018 [US1] Run the large-space reset end-to-end with T002 measurement; confirm completion (no OOM/timeout) in < 5 minutes and order-of-magnitude fewer rows loaded; record numbers in `specs/105-optimize-auth-reset/quickstart.md`

**Checkpoint**: Largest space resets successfully and fast; T006 still green.

---

## Phase 4: User Story 2 - Access rules unchanged (Priority: P1)

**Goal**: Prove and permanently protect that no entity's access changed (SC-002, FR-004, FR-011).

**Independent Test**: The T006 equivalence spec reports zero diff across all entity types; `schema:diff` reports no API change.

- [ ] T019 [US2] Verify T006 equivalence spec passes with **zero diff** after all Phase 3 trims; confirm the baseline covers every in-scope entity type (space, collaboration, callouts set, callout, contribution, post, whiteboard, link, memo, community, role set, rooms, storage aggregator + documents, templates, innovation flow, timeline/calendar, license) — extend the fixture/baseline if any type is missing
- [ ] T020 [US2] Run `pnpm run schema:diff` and confirm no schema/API drift (FR-010)
- [ ] T021 [US2] Confirm existing resilience/cascade tests stay green (FR-009 — failure-handling semantics unchanged)

**Checkpoint**: Equivalence locked as a permanent regression guard; no access drift; no API change.

---

## Phase 5: User Story 3 - Reset scales with entity count, not content volume (Priority: P2)

**Goal**: Demonstrate resource usage is driven by entity count, not stored-content volume (SC-005).

**Independent Test**: Two fixtures with equal entity counts but very different content volumes reset with comparable resource usage.

- [ ] T022 [P] [US3] Seed a second fixture: same entity count as T001 but heavy content per entity (large message histories, many documents, large contribution payloads) in `test/` fixtures
- [ ] T023 [US3] Reset both fixtures with T002 measurement and confirm rows-loaded/peak-heap differ only by a small margin (resource usage decoupled from content volume); record in `specs/105-optimize-auth-reset/quickstart.md`

**Checkpoint**: Optimization is structural, not a one-off tuning.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T024 [P] Audit every trimmed load for the required inline optimization comment (C-6 / Constitution Principle 5) across all files touched in Phase 3
- [ ] T025 [P] Run `pnpm lint` (tsc + biome) and fix any issues
- [ ] T026 Run `pnpm test:ci:no:coverage` and confirm the full suite is green
- [ ] T027 [P] Update PR description with domain impact, "no schema change", before/after rows-loaded + memory + timing numbers, and rollback note (redeploy/revert — no feature flag)
- [ ] T028 Run quickstart.md validation end-to-end (sections 1–5)
- [ ] T029 [P] Finalize the optimization overview `specs/105-optimize-auth-reset/optimization-summary.md` — a detailed per-entity list of what was trimmed/dropped/kept, with the rough before/after data-loading estimate table for a large space populated with the **measured** numbers from T018 and T023 (replacing the illustrative figures)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Phase 1 (needs the fixture T001). **Blocks all trimming.**
- **US1 (Phase 3)**: depends on Phase 2 green on unchanged code. Trims T007–T017 are mutually parallel; T018 depends on T007–T017.
- **US2 (Phase 4)**: depends on Phase 3 (verifies the trims). T019 depends on all trims; T020/T021 independent of each other.
- **US3 (Phase 5)**: depends on Phase 3 trims; independent of US2.
- **Polish (Phase 6)**: depends on Phases 3–5.

### Within Each Story

- The T006 equivalence spec must be re-run after each trim (T007–T017) — it is the gate that keeps US1 honest about US2.

### Parallel Opportunities

- T002, T003 (Setup) in parallel.
- **All trims T007–T017 in parallel** (distinct files, all guarded by T006).
- T020, T021 in parallel; T024, T025, T027 in parallel.

---

## Parallel Example: User Story 1 (the trims)

```bash
# After Phase 2 is green, launch the per-service trims together (distinct files):
Task: "Trim Space load in src/domain/space/space/space.service.authorization.ts"
Task: "Trim Callout load in src/domain/collaboration/callout/callout.service.authorization.ts"
Task: "Trim CalloutsSet load in src/domain/collaboration/callouts-set/callouts.set.service.authorization.ts"
Task: "Trim Template load in src/domain/template/template/template.service.authorization.ts"
Task: "Trim StorageAggregator load in src/domain/storage/storage-aggregator/storage.aggregator.service.authorization.ts"
Task: "Trim Community load in src/domain/community/community/community.service.authorization.ts"
Task: "Trim Timeline/Calendar loads"
Task: "Trim InnovationFlow load"
# Re-run T006 after each.
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational (equivalence net green on unchanged code).
2. Phase 3 trims (T007–T017), re-running T006 after each.
3. T018 large-space verification → **STOP and VALIDATE** (completes < 5 min, no OOM, rows down).
4. This is the deployable fix.

### Incremental Delivery

1. Setup + Foundational → safety net ready.
2. US1 trims → MVP (the production fix), guarded by equivalence.
3. US2 → lock equivalence + schema/resilience sign-off.
4. US3 → prove structural scaling.
5. Polish → comments audit, lint, full suite, PR notes, quickstart.

### Notes

- The biggest single memory wins are T008 (Callout `contributions`/`contributionDefaults`) and T010 (Template framing/whiteboard/profile) per research.md.
- `callout…space.community.roleSet` and `innovationFlow.states` and `document.tagset`/`createdBy` are **kept** — trimming them would change computed access.
- Batched child loading (to remove the N+1 re-fetch) is intentionally **out of scope**; pursue only if T018 misses the 5-minute target.

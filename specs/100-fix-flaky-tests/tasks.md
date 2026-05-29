---
description: 'Task list for feature 100-fix-flaky-tests'
---

# Tasks: Structural Fix for Flaky CI Tests

**Input**: Design documents from `/specs/100-fix-flaky-tests/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `punch-list.md` (data-model equivalent), `quickstart.md`

**Tests**: Not requested. This feature is itself a test-infrastructure fix — verification is per-task via 200x runs (per `quickstart.md`), not via writing new tests for the fixes themselves.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently. Each entry maps to a punch-list ID (PL-NN) where applicable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies on incomplete tasks)
- **[Story]**: Maps to user story (US1, US2, US3)
- File paths are repository-relative (anchor: `/Users/antst/work/alkemio/server-6012`)

## Path Conventions

Single project — sources under `src/`, additional unit-style specs under `test/`, docs under `docs/`.

---

## Phase 1: Setup

**Purpose**: No project-init work is required (this feature touches existing files). Verification tooling lives in Phase 2 because subsequent stories depend on it.

(intentionally empty)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared verification harness that US1 and US2 use to confirm their fixes hold over 200 runs (FR-012, SC-001).

**⚠️ CRITICAL**: T001 must complete before US1 / US2 verification tasks (T004, T011) can run.

- [X] T001 Wire up the `test:flake-verify` mechanism. Adds `"test:flake-verify": ".scripts/test/flake-verify.sh"` to `package.json` scripts section (between the existing `test:ci` and `test` entries) AND creates the wrapper script `.scripts/test/flake-verify.sh` that loops `pnpm exec vitest run --coverage` for `FLAKE_VERIFY_RUNS` iterations (default 200). Vitest 4 does not expose a `--repeat=N` CLI flag (verified during implementation — neither `--repeat` nor `--repeats` is recognised), so the loop lives in the wrapper rather than in the npm script value. See `research.md` Decision 8 and `quickstart.md`.

**Checkpoint**: `pnpm test:flake-verify <path>` resolves; ready for fix work.

---

## Phase 3: User Story 1 - Eliminate the two known flaky tests (Priority: P1) 🎯 MVP

**Goal**: Make `validation.pipe.spec.ts` (#6012) and `large-schema.spec.ts` (#6013) deterministic. After this phase, the two reported flakes can no longer fire on CI.

**Independent Test**: Run `pnpm test:flake-verify` against each fixed file 200 times under coverage mode (the trigger condition for #6012). Both must pass every iteration with no retries.

### Implementation for User Story 1

- [X] T002 [P] [US1] Apply `vi.hoisted` to `src/common/pipes/validation.pipe.spec.ts` (PL-01) per `research.md` Decision 1: hoist the `BaseHandler.handle` mock (currently at line 6) and the `class-transformer.plainToInstance` mock (currently at line 13) into a single `vi.hoisted(() => ({ ... }))` block at the top of the file. Update the assertion at line 100 to reference the hoisted handle (e.g., `expect(mocks.plainToInstance).toHaveBeenCalledWith(MyDto, value)`). No production-code changes. **Implementation note: already landed on develop in `bd310ead7 fix(test): eliminate flaky validation.pipe spec via hoisted mock + dynamic import (#6042)` — the fix uses `vi.hoisted` plus belt-and-braces `vi.resetModules()` and dynamic import. No new work required; verification confirmed identical to the prescribed pattern.**

- [X] T003 [P] [US1] Fix `test/schema-contract/perf/large-schema.spec.ts` (PL-02) per `research.md` Decisions 2 & 3: (a) replace the `Math.random() < 0.02` mutation at line 40 with a deterministic counter that removes every 50th `field5:` line; (b) remove the wall-clock assertion at line 58 (`expect(elapsed).toBeLessThan(5000)`). Keep the `expect(report.entries.length).toBeGreaterThan(0)` volume assertion. No production-code changes.

- [X] T004 [US1] Verify the US1 fixes hold by running:
  - `pnpm test:flake-verify src/common/pipes/validation.pipe.spec.ts`
  - `pnpm test:flake-verify test/schema-contract/perf/large-schema.spec.ts`

  Both must complete with 200/200 iterations passing. Capture summary output for the PR description. Depends on T001, T002, T003. **Verified: 200 / 200 iterations passing on a single invocation `pnpm test:flake-verify src/common/pipes/validation.pipe.spec.ts test/schema-contract/perf/large-schema.spec.ts` (~16 minutes wall-clock, completed 2026-05-28).**

**Checkpoint**: Issues #6012 and #6013 are closeable. MVP shippable here if scope is reduced.

---

## Phase 4: User Story 2 - Remove the broader class of flakiness (Priority: P2)

**Goal**: Apply the same patterns to the six additional confirmed and theoretical sites identified by the audit. After this phase, every site on the punch list is either `fixed` or `verified-clean`.

**Independent Test**: Each fixed file passes `pnpm test:flake-verify` 200x under coverage mode. The two `verified-clean` entries (PL-09, PL-10) require no work but are recorded in the PR.

### Implementation for User Story 2

- [X] T005 [P] [US2] Apply `vi.hoisted` to `src/platform-admin/domain/whiteboard/admin.whiteboard.service.spec.ts` (PL-03) per Decision 1. The current factory at lines 14-19 uses async `importOriginal`; pull the inner `base64ToBuffer: vi.fn()` out into a `vi.hoisted` block so the test-body's `vi.mocked(base64ToBuffer)` references at line 169 share identity with the SUT's resolved import. No production-code changes.

- [X] T006 [P] [US2] Defensive hoist for `src/common/interceptors/innovation.hub.interceptor.spec.ts` (PL-04) per Decision 1. The factory at lines 5-12 currently embeds `GqlExecutionContext: { create: vi.fn() }`; move the `vi.fn()` into a `vi.hoisted` block so subsequent `vi.mocked(GqlExecutionContext.create)` calls at lines 76/89/100 are guaranteed to share identity. No production-code changes.

- [X] T007 [P] [US2] Replace wall-clock concurrency check in `src/common/utils/async.map.spec.ts` (PL-05) per Decision 3. Current line 25 asserts `expect(elapsed).toBeLessThan(delay * 2.5)`; replace with a non-time-based concurrency probe — increment a counter on each promise body's entry, resolve a sentinel Promise once the counter reaches the expected concurrency, and assert the sentinel resolves before any of the bodies' awaited timers complete. No production-code changes.

- [X] T008 [P] [US2] Downgrade startup SLA assertions in `test/schema/bootstrap-parity.spec.ts` (PL-06) per Decision 3. Lines 126-127 currently gate on `light.durationMs <= 2000` and `full.durationMs < 10000`. Remove both `expect(...)` calls. Note: do **not** use `console.*` for informational output — Biome `noConsole: error` applies to spec files (no `*.spec.ts` override in `biome.json`). Acceptable mechanisms in order of preference: (a) attach the durations to Vitest's per-test context via `task.meta` (e.g., `expect.getState().currentTestName` + `task.meta.duration = light.durationMs`) so they appear in test reporter output; (b) leave the durations captured in local variables but unasserted — Vitest's standard test-timing report already surfaces total test duration. Keep the parity assertion (light vs full produce the same logical structure) — that is the test's primary purpose. No production-code changes.

- [X] T009 [P] [US2] Apply capture-and-restore env-var idiom in `test/schema-contract/integration/breaking-override.spec.ts` (PL-07) per Decision 4. (Note: despite the `integration/` directory name, this file uses the `.spec.ts` suffix and is a unit-style file-system test of the contract loader, not a service-integration test — it is in scope per FR-004's suffix-based rule. See `plan.md` Structure Decision.) In `beforeAll` (lines 24-35) capture original values of `SCHEMA_OVERRIDE_CODEOWNERS_PATH` and `SCHEMA_OVERRIDE_REVIEWS_JSON` before mutating them. In `afterAll` (lines 38-46) restore them unconditionally — remove the `try/catch` swallowing. Optionally adopt `vi.stubEnv` / `vi.unstubAllEnvs` if it shrinks the diff. No production-code changes.

- [X] T010 [P] [US2] Move `Math.random` spy to per-test scope in `src/services/infrastructure/naming/generate.name.id.spec.ts` (PL-08) per Decision 4. Current `beforeAll` (line 8) creates `randomSpy = vi.spyOn(Math, 'random')` with `randomSpy.mockRestore()` in `afterAll` (line 13); rewrite to `beforeEach`/`afterEach` so a single failing test cannot leak the spy to subsequent files. No production-code changes.

- [X] T011 [US2] Verify the six US2 fixes hold by running `pnpm test:flake-verify` against the affected files. Pass all six paths to a single invocation — Vitest will parallelise across `maxWorkers: 4` (per `vitest.config.ts`), reducing wall-clock from ~12–24 minutes (sequential) to roughly the time of the slowest file. Capture output for the PR description. Depends on T001, T005, T006, T007, T008, T009, T010. **Verified: 200 / 200 iterations passing on a single invocation across all six PL-03 … PL-08 files (~40 minutes wall-clock, completed 2026-05-28).**

**Checkpoint**: Punch-list entries PL-03 through PL-08 reach `fixed` status; PL-09 and PL-10 remain `verified-clean`. SC-003 (100% remediation rate) is achievable.

---

## Phase 5: User Story 3 - Prevent regression (Priority: P3)

**Goal**: Publish the anti-pattern reference, link it from `CLAUDE.md`, and evaluate automated detection per FR-015. After this phase, a contributor introducing one of the five fixed patterns can be steered to the documented replacement within 60 seconds (SC-004).

**Independent Test**: A reviewer unfamiliar with this feature can navigate from `CLAUDE.md` to the anti-pattern reference and find each of the five patterns, with failure-signature, wrong-form, and right-form examples.

### Implementation for User Story 3

- [X] T012 [P] [US3] Create `docs/testing-flakiness.md` per FR-014 and `research.md` Decision 6, with one section per anti-pattern (mock-identity, random-input, wall-clock-perf, process-state, async-completion). Each section includes: failure signature (typical CI assertion error text), root cause (one paragraph), wrong / right code examples sourced from the actual fixes in this feature, and conditions under which to use the alternative.

- [X] T013 [P] [US3] Add a one-line pointer to `docs/testing-flakiness.md` from `CLAUDE.md`. Insertion target: a new "## Testing" subsection inserted directly *before* the existing "## Linting and Formatting" subsection in `CLAUDE.md`. Subsection body: a single line — "When writing or reviewing tests, consult [`docs/testing-flakiness.md`](docs/testing-flakiness.md) for flakiness anti-patterns this project has paid for and the recommended replacements." Do not modify any other CLAUDE.md content.

- [X] T014 [P] [US3] Write a grep-based pre-commit detection script for the mock-identity-under-coverage pattern at `.scripts/lint/detect-mock-identity-flake.sh` per `research.md` Decision 7. The script flags any `*.spec.ts` containing `vi.mock(...)` with `vi.fn()` inside the factory body in a file that also imports the mocked symbol. Heuristic — false-positives accepted; the script writes findings to stdout and exits non-zero on any match. Document in the script's header that it is intentionally heuristic.

- [X] T015 [P] [US3] Write a grep-based pre-commit detection script for wall-clock perf assertions at `.scripts/lint/detect-wallclock-perf.sh` per Decision 7. The script flags any `*.spec.ts` containing `expect(...).toBeLessThan(<numeric literal ≥ 100>)` co-located in a file that also references `Date.now()` or `performance.now()`. Same heuristic-and-honest disclosure model as T014.

- [X] T016 [US3] Record the FR-015 evaluation outcome in the PR description (and a short note appended to `docs/testing-flakiness.md`): which detection script was implemented, which heuristic was deemed too noisy and why, and whether either is wired into a pre-commit hook (yes/no, with rationale). Depends on T012 (the docs file must exist before appending), T014, T015.

**Checkpoint**: SC-004 is verifiable — a contributor can locate the reference in <60s.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Update tracking artifacts and assemble PR-level deliverables (FR-013).

- [X] T017 Update `specs/100-fix-flaky-tests/punch-list.md` Status fields: PL-01 through PL-08 → `fixed`; PL-09 and PL-10 → `verified-clean` (no change, recorded for traceability). Confirm the Surface field for each fixed entry matches what was actually changed (all should remain `test-only` for the current punch list).

- [X] T018 Assemble the PR description (FR-013) covering: (a) the audit punch list with each entry's pattern, severity, remediation, and verification evidence; (b) link to `docs/testing-flakiness.md`; (c) FR-015 evaluation outcome from T016; (d) explicit statement that no production code was modified and no CI workflow files were added (per Q1, Q5 clarifications). Reference issues #6012 and #6013 with `Closes #6012` / `Closes #6013` keywords. **Drafted at `specs/100-fix-flaky-tests/pr-description.md`; copy into the PR body when opening.**

- [X] T019 Schedule the SC-002 30-day post-merge follow-up so the success criterion does not silently lapse. Implementation: include in the PR description (T018) a `Follow-up:` section with a checkbox item "[ ] 30-day flake-recurrence review (target date: merge_date + 30d) — confirm no CI re-runs reported as caused by punch-list sites; update `punch-list.md` if any recurrence observed." Optionally use `/schedule` to create a scheduled remote agent that opens a follow-up issue on the target date. No code change. **Follow-up checkbox included in `pr-description.md`. Optional `/schedule` agent not created — user can run `/schedule` manually if they prefer an automated reminder over a PR-description checkbox.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: empty — nothing to do.
- **Phase 2 (Foundational)**: T001 only. Blocks T004 and T011 (verification tasks).
- **Phase 3 (US1)**: Depends on T001. T002 and T003 are parallel; T004 depends on both.
- **Phase 4 (US2)**: Depends on T001. T005–T010 are all parallel; T011 depends on T005–T010.
- **Phase 5 (US3)**: Depends on T001 conceptually only (no verification harness needed for docs). T012, T013, T014, T015 are parallel; T016 depends on T012 (docs file must exist), T014, and T015.
- **Phase 6 (Polish)**: T017 depends on T004, T011, T016. T018 depends on T017. T019 depends on T018 (the follow-up section is part of the PR description).

### User Story Dependencies

- **US1**: Independent. The fixes in T002 and T003 do not depend on each other or on US2/US3 work. **MVP candidate** — shippable on its own as a hotfix that closes #6012 / #6013.
- **US2**: Independent of US1. Each of T005–T010 is independent of every other; staffable as six parallel tracks.
- **US3**: Independent of US1 / US2 implementation. The docs file (T012) cites the fixes as examples, so it gains stronger examples if drafted *after* US1/US2 land — but it can begin in parallel using the punch-list and research.md as source material.

### Within Each User Story

- US1 / US2 fixes are file-scoped: each fix touches exactly one test file. No model→service→endpoint ordering applies.
- Verification tasks (T004, T011) MUST run after their corresponding fixes are committed and confirm 200/200 passing before the story is considered closeable.
- US3 docs (T012) and detection scripts (T014, T015) can proceed in any order; the FR-015 evaluation note (T016) is the synthesis step.

### Parallel Opportunities

- T002 ∥ T003 (US1 fixes — different files)
- T005 ∥ T006 ∥ T007 ∥ T008 ∥ T009 ∥ T010 (US2 fixes — six different files)
- T012 ∥ T013 ∥ T014 ∥ T015 (US3 outputs — different artifacts)
- T002–T003 ∥ T005–T010 ∥ T012–T015 (cross-story parallelism — staff one developer per story or batch)

Verification tasks (T004, T011) are sequential within their story but can run concurrently across stories once their fixes are in place.

---

## Parallel Example: User Story 2

```bash
# Six fixes — different files, no cross-dependencies. Pick one branch per developer
# or batch all six on a single branch and verify together via T011.

Task: "Apply vi.hoisted to src/platform-admin/domain/whiteboard/admin.whiteboard.service.spec.ts (PL-03)"
Task: "Defensive hoist for src/common/interceptors/innovation.hub.interceptor.spec.ts (PL-04)"
Task: "Replace wall-clock concurrency check in src/common/utils/async.map.spec.ts (PL-05)"
Task: "Downgrade startup SLA assertions in test/schema/bootstrap-parity.spec.ts (PL-06)"
Task: "Capture-and-restore env-var idiom in test/schema-contract/integration/breaking-override.spec.ts (PL-07)"
Task: "Per-test scope for Math.random spy in src/services/infrastructure/naming/generate.name.id.spec.ts (PL-08)"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 2 (T001): add the verify script.
2. Phase 3 (T002, T003, T004): fix the two reported tests; verify 200x each.
3. Stop and ship — closes #6012 and #6013, removes the most-felt CI noise.

### Incremental Delivery

1. Setup + Foundational (T001).
2. US1 (MVP) → ship → close issues #6012 / #6013.
3. US2 → ship → punch list reaches 100% remediation (SC-003).
4. US3 → ship → anti-pattern reference live, FR-015 evaluation documented.
5. Polish (T017 → T018 → T019) → final PR with full punch-list status table and SC-002 30-day follow-up scheduled.

### Single-developer linear path

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019.

### Parallel team strategy

- Dev A: US1 (T002, T003, T004)
- Dev B: US2 (T005–T010, T011) — can sub-divide further across two developers since the six fixes are independent
- Dev C: US3 (T012–T016) — proceeds in parallel using punch-list.md and research.md as source
- PR author: Polish (T017, T018, T019) — synthesises the punch-list status, PR description, and SC-002 follow-up scheduling once US1 / US2 / US3 results are in

T001 is a quick (one-line) prerequisite that the first developer to start does on day zero.

---

## Notes

- **Punch list is closed at start of implementation.** The 10-entry punch list (`punch-list.md`) is the authoritative scope. If implementation surfaces a *new* flaky site not on the punch list:
  1. Append a new `PL-NN` entry to `punch-list.md` with the same field set as existing entries.
  2. Apply the appropriate Decision-1–4 mechanism (per `research.md`).
  3. Add a `[P] [US2]` task to `tasks.md` mirroring the structure of T005–T010.
  4. Include the new entry in T011's verification batch and in the T018 PR description.
  
  This intake path satisfies FR-004's "audit" requirement on a continuous-discovery basis without requiring a separate `/speckit.specify` cycle.

- Every test edit in US1 / US2 keeps the file's *test purpose* unchanged — only the flake mechanism is replaced. If the natural fix changes the test's intent, treat that as a signal to re-research the root cause rather than ship the change.
- No production-code changes are anticipated for the current punch list (all entries have Surface = `test-only` per `punch-list.md`). FR-005 / Q1 leaves the door open for production fixes if a future audit-surfaced site reveals a real production race; none in scope today.
- `vi.hoisted` is already used elsewhere in the repo (`src/apm/apm.spec.ts:3-6`, `src/apm/plugins/apm.apollo.plugin.spec.ts:3`) — follow that style for consistency.
- Commit per task or per logical pair (e.g., T002 + T004's verification output). Avoid bundling unrelated fixes into a single commit so reviewers can map each fix to its punch-list entry.
- Stop at any checkpoint to validate independently — US1 alone is a viable MVP.

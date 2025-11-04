```markdown
---
description: 'Task list for schema baseline automation workflow'
---

# Tasks: Automated Schema Baseline Generation

**Input**: Design documents from `/specs/012-generate-schema-baseline/`
**Prerequisites**: plan.md (required), spec.md (user stories), research.md, data-model.md, quickstart.md

**Tests**: Tests are optional; this feature relies on workflow diagnostics and existing schema contract checks.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Task can run in parallel (different files, no dependency overlap)
- **[Story]**: User story label (US1, US2, US3)
- Include exact file paths in every description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the baseline workflow file and trigger scaffold.

- [x] T001 Create `.github/workflows/schema-baseline.yml` with `name`, `on: push` to `develop`, and concurrency group placeholder `schema-baseline-develop`.
- [x] T002 Define the initial job shell (runner, env placeholders for signing secrets) inside `.github/workflows/schema-baseline.yml`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core workflow plumbing required before any user story steps execute.

- [x] T003 Add checkout step with full history fetch in `.github/workflows/schema-baseline.yml` using `actions/checkout@v4`.
- [x] T004 Add Node 20 setup and pnpm 10.17.1 bootstrap steps in `.github/workflows/schema-baseline.yml` via `actions/setup-node@v4` and `corepack` commands.
- [x] T005 Add dependency installation step (`pnpm install --frozen-lockfile`) to `.github/workflows/schema-baseline.yml`.

**Checkpoint**: Workflow can bootstrap repository dependencies on merge events.

---

## Phase 3: User Story 1 - Baseline stays current after merges (Priority: P1) 🎯 MVP

**Goal**: Automatically regenerate `schema-baseline.graphql` whenever `develop` gains new changes and publish the update through an automation-owned pull request.

**Independent Test**: Merge a branch into `develop` and confirm the workflow signs the baseline commit, pushes a `schema-baseline/<run-id>` branch, and opens (or refreshes) the pull request (or exits cleanly when no diff exists).

### Implementation for User Story 1

- [x] T006 [US1] Add step calling `scripts/schema/generate-schema.snapshot.ts` to emit `schema.graphql` with diagnostics in `.github/workflows/schema-baseline.yml`.
- [x] T007 [US1] Add step to fetch previous baseline (`origin/develop:schema-baseline.graphql`) into `tmp/prev.schema.graphql` inside `.github/workflows/schema-baseline.yml`.
- [x] T008 [US1] Invoke `scripts/schema/diff-schema.ts` to produce `change-report.json` and detect schema differences inside `.github/workflows/schema-baseline.yml`.
- [x] T009 [US1] Add conditional shell block copying `schema.graphql` to `schema-baseline.graphql`, staging the file only when diffs exist, within `.github/workflows/schema-baseline.yml`.
- [x] T010 [US1] Configure `crazy-max/ghaction-import-gpg@v6` step to import signing key and trust settings in `.github/workflows/schema-baseline.yml`.
- [x] T011 [US1] Add signed commit step followed by branch push and PR wiring so baseline updates land on `schema-baseline/<run-id>` instead of directly on `develop` within `.github/workflows/schema-baseline.yml`.

**Checkpoint**: Baseline file remains synchronized with `develop` after merges.

---

## Phase 4: User Story 2 - Maintainers review schema diffs (Priority: P2)

**Goal**: Provide maintainers with actionable diff summaries and persisted artifacts for each regeneration.

**Independent Test**: Trigger workflow with a schema change and verify the run summary shows human-readable diff details alongside downloadable artifacts.

### Implementation for User Story 2

- [x] T012 [P] [US2] Implement diff summary helper in `scripts/schema/publish-baseline.ts` to transform `change-report.json` into markdown and exit codes.
- [x] T013 [US2] Wire `scripts/schema/publish-baseline.ts` into `.github/workflows/schema-baseline.yml` to append markdown to the GitHub Actions job summary and set outputs.
- [x] T014 [US2] Add artifact upload step for `change-report.json`, `schema.graphql`, and `tmp/prev.schema.graphql` in `.github/workflows/schema-baseline.yml`.

**Checkpoint**: Maintainers can inspect diffs quickly without cloning artifacts manually.

---

## Phase 5: User Story 3 - Owners respond to generation failures (Priority: P3)

**Goal**: Alert CODEOWNERS when baseline regeneration fails and surface diagnostic context.

**Independent Test**: Force the workflow to fail (e.g., revoke signing key) and confirm a CODEOWNERS-tagged comment posts on the relevant baseline branch commit with run logs.

### Implementation for User Story 3

- [x] T015 [US3] Add `actions/github-script@v7` failure handler that posts a commit comment tagging CODEOWNERS with the run URL inside `.github/workflows/schema-baseline.yml`.
- [x] T016 [US3] Capture signing/push failure details into the workflow summary (including exit codes and remediation hints) within `.github/workflows/schema-baseline.yml` and ensure the job fails explicitly.

**Checkpoint**: Failures generate actionable, timely notifications for maintainers.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and quality improvements spanning all stories.

- [x] T017 Document signing secret requirements and manual rerun instructions in `docs/Running.md`.
- [x] T018 Add schema baseline workflow troubleshooting steps to `docs/Developing.md` (linking quickstart guidance).

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Phase 1** → lays down workflow file.
2. **Phase 2** → enables repository bootstrap (blocks all user stories).
3. **Phase 3 (US1)** → requires Phase 2; delivers MVP once complete.
4. **Phase 4 (US2)** and **Phase 5 (US3)** → depend on US1 for generated outputs but can proceed in parallel after US1 finishes.
5. **Phase 6** → runs last, updating shared documentation.

### User Story Dependencies

- **US1 (P1)**: Depends on foundational workflow plumbing.
- **US2 (P2)**: Depends on US1 artifacts (change-report.json, schema-baseline updates).
- **US3 (P3)**: Depends on US1 push semantics to know when to notify.

### Within Each User Story

- US1 tasks execute sequentially inside the workflow file (generation → diff → commit).
- US2 begins with helper script creation (T012) that can occur in parallel with final workflow wiring (T013, T014).
- US3 tasks sequentially augment failure handling.

## Parallel Opportunities

- **Setup**: None (new file creation order matters).
- **Foundational**: Steps touch the same workflow file—treat sequentially.
- **US2**: T012 can run in parallel with ongoing workflow edits (T013–T014) once branch is coordinated.
- **US3**: Tasks share the same workflow block; execute sequentially to avoid merge conflicts.
- **Polish**: T017 and T018 update separate docs and can run concurrently.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phases 1 & 2 to establish the workflow skeleton.
2. Deliver Phase 3 (US1) to achieve automatic baseline PR publication.
3. Validate by merging to `develop` and confirming a signed baseline pull request—this is the deployable MVP.

### Incremental Delivery

1. MVP (US1) ensures baseline freshness.
2. Add US2 to provide diff visibility without manual cloning.
3. Add US3 to close the loop with failure notifications.
4. Finish with documentation polish.

### Parallel Team Strategy

- Developer A: Owns workflow bootstrap (Phases 1–3).
- Developer B: Builds diff summary helper (T012) and integrates visibility features (T013–T014).
- Developer C: Implements failure notifications (T015–T016) once US1 commits exist.
- Team shares documentation updates in Phase 6.
```

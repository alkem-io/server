# Tasks: Optimize CI Builds

**Input**: Design documents from `/specs/042-optimize-ci-builds/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Understand current state and prepare for modifications

- [x] T001 Read and audit all workflow files under `.github/workflows/` to confirm current runner labels, triggers, caching, and job structure match expectations from research.md
- [x] T002 Verify `sonar-project.properties` exists at repo root and contains required scan configuration (coverage paths, exclusions)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational tasks — this feature modifies only CI workflow YAML files with no shared infrastructure prerequisites between stories.

**Checkpoint**: Setup complete — user story implementation can begin.

---

## Phase 3: User Story 1 — Eliminate Duplicate Test Execution (Priority: P1) 🎯 MVP

**Goal**: Merge `ci-tests.yml` and `trigger-sonarqube.yml` into a single workflow with two jobs (`test` → `sonarqube`), so tests run exactly once per PR with coverage enabled.

**Independent Test**: Open a PR, confirm tests execute once (with coverage), SonarQube consumes the coverage artifact, and both CI gate and SonarQube status report correctly.

### Implementation for User Story 1

- [x] T003 [US1] Rewrite `.github/workflows/ci-tests.yml` to contain a unified workflow with two jobs: (1) `test` job that runs `pnpm run test:ci` (with coverage), uploads `coverage-ci/` as an artifact; (2) `sonarqube` job with `needs: test` that checks out with `fetch-depth: 0`, downloads the coverage artifact, runs `sonarsource/sonarqube-scan-action@v7` and `sonarsource/sonarqube-quality-gate-action@v1` (both `continue-on-error: true`). Merge triggers from both files: `push` to `[develop, main]`, `pull_request` against `[develop, main]`, `workflow_dispatch`. Keep `runs-on: arc-runner-set` for now (runner migration is US2). Add `permissions: contents: read, pull-requests: write, checks: write` at workflow level.
- [x] T004 [US1] Delete `.github/workflows/trigger-sonarqube.yml` (merged into ci-tests.yml)

**Checkpoint**: Tests run once per PR. SonarQube consumes shared coverage artifact. Validate by pushing to a PR branch.

---

## Phase 4: User Story 2 — Migrate CI to Apple Silicon Runner (Priority: P2)

**Goal**: Replace `arc-runner-set` with `[self-hosted, macOS, ARM64, apple-silicon, m4]` for all Node.js CI workflows.

**Independent Test**: Confirm all migrated workflows execute on the Apple Silicon runner and complete successfully.

### Implementation for User Story 2

- [x] T005 [US2] Update `runs-on` in `.github/workflows/ci-tests.yml` — change both `test` and `sonarqube` jobs from `arc-runner-set` to `[self-hosted, macOS, ARM64, apple-silicon, m4]`. Remove or adjust the `NODE_OPTIONS` comment about pod resources (no longer applicable on macOS).
- [x] T006 [P] [US2] Update `runs-on` in `.github/workflows/schema-contract.yml` — change all jobs from `arc-runner-set` to `[self-hosted, macOS, ARM64, apple-silicon, m4]`
- [x] T007 [P] [US2] Update `runs-on` in `.github/workflows/schema-baseline.yml` — change all jobs from `arc-runner-set` to `[self-hosted, macOS, ARM64, apple-silicon, m4]`
- [x] T008 [P] [US2] Update `runs-on` in `.github/workflows/review-router.yml` — change from `arc-runner-set` to `[self-hosted, macOS, ARM64, apple-silicon, m4]`

**Checkpoint**: All Node.js CI workflows run on Apple Silicon. Docker/K8s workflows unchanged on `ubuntu-latest`.

---

## Phase 5: User Story 3 — Add Build and Dependency Caching (Priority: P3)

**Goal**: Add pnpm store caching with content-addressed keys and TypeScript build output caching with per-branch keys and `develop` fallback.

**Independent Test**: Trigger two consecutive CI runs on the same branch; confirm second run restores caches and completes faster.

### Implementation for User Story 3

- [x] T009 [US3] Add pnpm store cache step to `.github/workflows/ci-tests.yml` `test` job — use `actions/cache@v4` with `path: ~/.local/share/pnpm/store/v10`, `key: pnpm-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('pnpm-lock.yaml') }}`, `restore-keys: pnpm-${{ runner.os }}-${{ runner.arch }}-`. Place before `pnpm install`. Remove `cache: 'pnpm'` from `actions/setup-node` to avoid conflict.
- [x] T009b [US3] N/A — Vitest compiles on-the-fly; no `pnpm build` in test job (per research.md R4) `test` job — use `actions/cache@v4` with `path: dist/, tsconfig.tsbuildinfo`, `key: tsc-${{ runner.os }}-${{ runner.arch }}-${{ github.ref_name }}-${{ hashFiles('src/**/*.ts', 'tsconfig.json') }}`, `restore-keys` with branch fallback then `develop` fallback. Place before `pnpm build` step.
- [x] T010 [US3] N/A — schema-contract uses `ts-node` directly, no `pnpm build` step — use `actions/cache@v4` with `path: dist/, tsconfig.tsbuildinfo`, `key: tsc-${{ runner.os }}-${{ runner.arch }}-${{ github.ref_name }}-${{ hashFiles('src/**/*.ts', 'tsconfig.json') }}`, `restore-keys` with branch fallback then `develop` fallback. Place before `pnpm build` step.
- [x] T011 [P] [US3] Add pnpm store cache step to `.github/workflows/schema-contract.yml` — same pattern as T009. Remove `cache: 'pnpm'` from `actions/setup-node`.
- [x] T012 [P] [US3] Add pnpm store cache step to `.github/workflows/schema-baseline.yml` — same pattern as T009. Remove `cache: 'pnpm'` from `actions/setup-node`.
- [x] T013 [P] [US3] N/A — schema-baseline uses `ts-node` directly, no `pnpm build` step — same pattern as T010, placed before `pnpm build` step.
- [x] T013b [P] [US3] N/A — review-router is Python-based, no pnpm dependencies — same pattern as T009, if the workflow installs pnpm dependencies. Remove `cache: 'pnpm'` from `actions/setup-node` if present.

**Checkpoint**: Caches restore on subsequent runs. Dependency install < 30s on cache hit. Build step uses incremental compilation.

---

## Phase 6: User Story 4 — Remove Duplicate Docker Release Workflow (Priority: P4)

**Goal**: Delete the legacy Docker release workflow and rename the newer one to maintain clean naming.

**Independent Test**: Create a release and confirm exactly one Docker build-and-push workflow triggers with correct tags.

### Implementation for User Story 4

- [x] T014 [US4] Delete `.github/workflows/build-release-docker-hub.yml` (legacy workflow with outdated action versions and manual tag parsing)
- [x] T015 [US4] Rename `.github/workflows/build-release-docker-hub-new.yml` to `.github/workflows/build-release-docker-hub.yml` (use `git mv`)

**Checkpoint**: Single Docker release workflow exists with clean naming. Verify triggers and tag generation are correct.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T016 Run quickstart.md verification checklist against a real PR to validate all changes end-to-end
- [x] T017 Verify K8s deploy workflows (`.github/workflows/build-deploy-k8s-*-hetzner.yml`) are unchanged and still use `ubuntu-latest`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: N/A — no foundational tasks
- **US1 (Phase 3)**: Depends on Setup — merges workflow files
- **US2 (Phase 4)**: Depends on US1 — migrates the unified workflow to Apple Silicon
- **US3 (Phase 5)**: Depends on US2 — adds caching to workflows already on Apple Silicon (cache keys include `runner.os` and `runner.arch`)
- **US4 (Phase 6)**: Independent of US1–US3 — can run in parallel after Setup
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories. Must be done first because US2/US3 modify the same file.
- **US2 (P2)**: Depends on US1 (modifies `ci-tests.yml` which US1 rewrites). T006/T007/T008 are parallel (different files).
- **US3 (P3)**: Depends on US2 (cache keys use `runner.os`/`runner.arch` which change after runner migration).
- **US4 (P4)**: Independent — can run any time after Setup.

### Parallel Opportunities

- T006, T007, T008 can run in parallel (different workflow files, all runner migrations)
- T011, T012, T013 can run in parallel (different workflow files, all caching additions)
- US4 (T014, T015) can run in parallel with US1–US3 (completely independent files)

---

## Parallel Example: User Story 2

```bash
# After T005 completes (ci-tests.yml), launch remaining runner migrations together:
Task T006: "Update runs-on in schema-contract.yml"
Task T007: "Update runs-on in schema-baseline.yml"
Task T008: "Update runs-on in review-router.yml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 3: US1 — Eliminate duplicate tests (T003–T004)
3. **STOP and VALIDATE**: Push to a PR, confirm tests run once, SonarQube works
4. Merge if acceptable as standalone improvement

### Incremental Delivery

1. US1 → Validate (eliminate duplication — biggest impact)
2. US2 → Validate (Apple Silicon migration — speed boost)
3. US3 → Validate (caching — further speed boost)
4. US4 → Validate (cleanup — reduce maintenance burden)
5. Polish → Final end-to-end validation

### Recommended Approach

Since all changes are to workflow YAML files and the total scope is small (~5 files modified, 1 deleted, 1 renamed), all user stories can be implemented in a single session and validated together on one PR. The sequential dependency chain (US1 → US2 → US3) ensures no conflicts.

---

## Notes

- All changes are to `.github/workflows/*.yml` files — no application source code is modified
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- macOS runners do NOT support Docker container actions — all actions used are Node.js or composite (verified in research.md R3)
- Cache keys must include `runner.os` and `runner.arch` to avoid cross-platform cache pollution
- SonarQube quality gate remains advisory (non-blocking) per existing policy

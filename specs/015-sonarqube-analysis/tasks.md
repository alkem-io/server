---
description: 'Task list for SonarQube static analysis integration'
---

# Tasks: SonarQube Static Analysis Integration

**Input**: Design documents from `/specs/015-sonarqube-analysis/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new automated tests are required by default for this CI-only integration. We will rely on CI pipeline runs and manual validation of SonarQube status, adding tests only if helper scripts are introduced and benefit from automation (per Constitution Principle 6).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure CI and SonarQube prerequisites are in place before any story work.

- [ ] T001 Verify access to SonarQube project for this repo at https://sonarqube.alkem.io (no code changes)
- [ ] T002 Confirm CI runner environment (Node 20, pnpm) matches repository toolchain in .github workflows
- [ ] T003 Document required CI secrets for SonarQube (token, project key) in specs/015-sonarqube-analysis/quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core CI and configuration that MUST be complete before any user story can be fully implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 [P] Create or update SonarQube configuration file at `sonar-project.properties` (or equivalent) at repo root
- [ ] T005 [P] Define SonarQube project key and name for this repository in `sonar-project.properties`
- [ ] T006 [P] Configure SonarQube project and quality gate in the SonarQube UI for this repo (no code changes)
- [ ] T007 Wire SonarQube token and project key into CI secrets (e.g., `SONAR_TOKEN`, `SONAR_PROJECT_KEY`) via CI settings (no code changes)
- [ ] T008 Update specs/015-sonarqube-analysis/quickstart.md with final secret names and SonarQube project URL

**Checkpoint**: SonarQube project and CI secrets are ready; user story implementation can now begin.

---

## Phase 3: User Story 1 - Developer sees PR quality gate (Priority: P1) 🎯 MVP

**Goal**: When a developer opens a pull request, CI runs SonarQube analysis and reports a visible quality gate status on the PR.

**Independent Test**: Open a test PR and verify that SonarQube analysis runs and its status appears in the PR checks without changing merge behavior.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Add a dedicated SonarQube analysis job to `.github/workflows/ci.yml` (or new `.github/workflows/sonar-pr.yml`) that runs on pull_request events
- [ ] T010 [P] [US1] Configure the SonarQube job to use repository Node 20 toolchain and pnpm for build steps
- [ ] T011 [US1] Wire SonarQube CLI or scanner invocation into the CI job using `SONAR_TOKEN` and `SONAR_PROJECT_KEY` secrets
- [ ] T012 [US1] Ensure the SonarQube job publishes a clear status back to the pull request checks (pass/fail) without blocking merges
- [ ] T013 [US1] Adjust CI job naming and output messages so SonarQube results are easily discoverable by developers in the PR view
- [ ] T014 [US1] Validate User Story 1 by opening a test PR and confirming analysis runs and status appears on the PR

**Checkpoint**: User Story 1 is independently functional; every PR runs SonarQube and shows a quality gate status.

---

## Phase 4: User Story 2 - Release manager monitors main branch trend (Priority: P2)

**Goal**: Release managers can rely on SonarQube dashboards to see up-to-date metrics for the develop branch.

**Independent Test**: After a few PRs merge, open the SonarQube project dashboard and verify that the develop branch metrics and history are present and current.

### Implementation for User Story 2

- [ ] T015 [P] [US2] Confirm SonarQube project branch configuration treats `develop` as the main branch in the SonarQube UI
- [ ] T016 [US2] Ensure CI job configuration sends branch information (including `develop`) correctly to SonarQube in `.github/workflows/ci.yml` or `.github/workflows/sonar-pr.yml`
- [ ] T017 [US2] Verify that SonarQube retains history for `develop` and displays coverage, bugs, vulnerabilities, and code smells over time
- [ ] T018 [US2] Add a short "How to read SonarQube dashboards" note to `specs/015-sonarqube-analysis/quickstart.md` for release managers
- [ ] T019 [US2] Validate User Story 2 by checking the SonarQube project dashboard after merging at least one PR into `develop`

**Checkpoint**: User Story 2 is independently functional; release managers can see trends and current state for `develop`.

---

## Phase 5: User Story 3 - DevOps secures SonarQube credentials (Priority: P3)

**Goal**: DevOps can provision and rotate SonarQube tokens safely without repository changes.

**Independent Test**: Rotate the token once, update CI secrets, and confirm SonarQube analysis still works for a test PR while the old token is no longer valid.

### Implementation for User Story 3

- [ ] T020 [P] [US3] Document the SonarQube token rotation procedure in `specs/015-sonarqube-analysis/quickstart.md` (including where to update CI secrets)
- [ ] T021 [US3] Validate that SonarQube tokens and project keys never appear in repository files by scanning `.github/workflows/` and repo config
- [ ] T022 [US3] Perform a dry-run token rotation in SonarQube (or test project) and update CI secrets to use the new token
- [ ] T023 [US3] Open a test PR after rotation to confirm SonarQube analysis still succeeds with the new token
- [ ] T024 [US3] Invalidate or remove the old token in SonarQube and confirm it can no longer be used

**Checkpoint**: User Story 3 is independently functional; token rotation is safe, documented, and validated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall maintainability.

- [ ] T025 [P] Update repository documentation (e.g., `docs/QA.md` or `docs/Developing.md`) to mention SonarQube analysis for PRs
- [ ] T026 Review CI workflow files for duplication and refactor SonarQube steps into reusable YAML anchors or composite actions if helpful
- [ ] T027 [P] Add a short troubleshooting section to `specs/015-sonarqube-analysis/quickstart.md` for common SonarQube CI issues
- [ ] T028 Run through the full quickstart flow and validate that all steps work as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** — No dependencies; can start immediately.
- **Phase 2: Foundational** — Depends on Setup completion; BLOCKS all user stories.
- **Phase 3: User Story 1 (P1)** — Depends on Foundational; provides the MVP.
- **Phase 4: User Story 2 (P2)** — Depends on Foundational; can run after or alongside US1 once CI integration is stable.
- **Phase 5: User Story 3 (P3)** — Depends on Foundational; can run after SonarQube integration is working for at least one PR.
- **Phase 6: Polish** — Depends on completion of at least US1 (ideally all user stories).

### User Story Dependencies

- **User Story 1 (P1)** — Independent once foundational CI + secrets are in place.
- **User Story 2 (P2)** — Builds on the same integration but is conceptually independent; it relies on metrics existing for `develop`.
- **User Story 3 (P3)** — Depends on a working integration and CI secrets.

### Parallel Opportunities

- Phase 1 tasks T001–T003 can run in parallel.
- Phase 2 tasks T004–T008 marked [P] can be executed in parallel as they touch different systems/files.
- After Phase 2, US1 (T009–T014), US2 (T015–T019), and US3 (T020–T024) can be partially parallelized across different team members, provided CI changes are coordinated.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational CI and secrets.
3. Complete Phase 3: User Story 1 tasks T009–T014.
4. Validate by opening a PR and confirming SonarQube status appears.

### Incremental Delivery

1. MVP: US1 — PR analysis and visible status.
2. Add US2 — develop-branch dashboards and documentation.
3. Add US3 — token rotation and credentials hygiene.
4. Apply Phase 6 polish and doc updates.

# Tasks: Drop `accountUpn` column and sanitize usage

**Feature**: `016-drop-account-upn`
**Branch**: `016-drop-account-upn`

## Phase 1: Setup

- [X] T001 Ensure local environment is on branch 016-drop-account-upn
- [X] T002 Confirm ability to run migrations and tests in this repo

## Phase 2: Foundational

- [X] T004 Perform repository-wide search for `accountUpn` in src/, test/, and scripts/
- [X] T005 Catalogue all `accountUpn` usages by type (entity field, query, log, config) in specs/016-drop-account-upn/research.md to satisfy FR-002

## Phase 3: User Story 1 - Safely remove unused account identifier (P1)

- [X] T006 [US1] Identify the TypeORM entity and table where `accountUpn` is defined in src/domain
- [X] T007 [US1] Design migration to drop `accountUpn` column from the account-related table
- [X] T008 [US1] Implement migration file to drop `accountUpn` column in src/domain or migrations directory
- [X] T009 [US1] Update any repository or query definitions that reference `accountUpn` to use stable identifiers
- [X] T010 [US1] Update or remove any tests that assume presence of `accountUpn` in the schema
- [X] T011 [US1] Run `pnpm test:ci` or focused tests to verify no failures related to `accountUpn`

## Phase 4: User Story 2 - Confirm actual usage of `accountUpn` (P2)

- [X] T012 [P] [US2] For each found usage, classify whether it is live, dead, or defensive code
- [X] T013 [US2] Document confirmed `accountUpn` usage scenarios and decisions in specs/016-drop-account-upn/research.md
- [X] T014 [US2] Remove dead or redundant `accountUpn` references from code and configuration

## Phase 5: User Story 3 - Provide alternative logic where needed (P3)

- [X] T015 [P] [US3] For each live `accountUpn` dependency, select replacement identifier (e.g., account id or external identity id)
- [X] T016 [US3] Refactor code paths that depended on `accountUpn` to use the chosen replacement identifiers
- [X] T017 [US3] Add or update tests for refactored flows to confirm behavior matches pre-change expectations

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 [P] Remove any lingering comments or TODOs referring to `accountUpn` in src/ and test/
- [X] T019 [P] Update any relevant documentation references to `accountUpn` in docs/
- [X] T020 Review change set to ensure all schema, code, and tests consistently no longer rely on `accountUpn`
- [X] T021 Verify that dashboards, alerts, and log queries do not depend on `accountUpn` and update them as needed to satisfy FR-006
- [X] T022 Run schema print/sort/diff and migration validation scripts for this change in line with the schema contract and migration principles

## Dependencies

- Phase 1 must complete before Phase 2.
- Phase 2 (foundational search and catalog) must complete before Phases 3–5.
- Phase 3 (User Story 1) should be completed before applying production migrations.
- Phase 4 (User Story 2) feeds into Phase 5 for replacement logic decisions.

## Parallel Execution Examples

- T004 and T005 can be partially parallelized if different team members handle search and documentation.
- Within User Story 2, T012 and T014 can run in parallel for different code areas.
- In User Story 3, T015 and T016 can be parallelized across distinct services or modules.

## Implementation Strategy

- MVP scope focuses on User Story 1 (Phase 3): safely removing the column and ensuring all core flows and tests pass without `accountUpn`.
- Subsequent phases refine understanding of usage (User Story 2) and implement replacement logic where needed (User Story 3), followed by polish and documentation updates.

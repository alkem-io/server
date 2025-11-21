# Tasks: Postgres DB Convergence – Schema-First & CSV Data Path

## Phase 1 – Setup

- [X] T001 Ensure local Postgres instance (or connection) is available for baseline schema validation (no code change).
- [X] T002 Validate existing MySQL and Kratos connectivity for export/import rehearsals (no code change).

## Phase 2 – Foundational

- [X] T003 Document target Postgres version range and environment assumptions in `docs/DataManagement.md`.
- [X] T004 Add configuration entries for Postgres connections (Alkemio + Kratos) in `alkemio.yml` if missing.
- [X] T005 [P] Add any new environment variables required for Postgres/CSV migration in `.env.docker` and related sample env files.
- [X] T006 [P] Create migration tooling folder structure under `.scripts/migrations/postgres-convergence`.
- [X] T007 Add high-level migration overview section for schema-first + CSV approach in `docs/DataManagement.md`.

## Phase 3 – User Story 1: Postgres-only schemas (P1)

- [X] T008 [US1] Define Alkemio Postgres baseline migration strategy in `specs/018-postgres-db-convergence/plan.md` (update if needed).
- [X] T009 [P] [US1] Add or adjust TypeORM configuration to support Postgres baseline generation in `src/core/database/typeorm.config.ts`.
- [X] T010 [US1] Generate initial Postgres baseline migration file for Alkemio in `scripts/migrations/` (TypeORM migration).
- [X] T011 [US1] Wire Postgres baseline migration into existing migration run scripts in `package.json` and/or `scripts/migrations`.
- [X] T012 [P] [US1] Add documentation for applying Kratos migrations on Postgres in `docs/DataManagement.md`.
- [X] T013 [US1] Add quickstart section for Postgres-only Alkemio + Kratos deployment in `specs/018-postgres-db-convergence/quickstart.md` (update if needed).
- [X] T014 [US1] Create or update migration validation script for Postgres schema under `scripts/migrations/`.
- [X] T015 [P] [US1] Ensure contract tests and schema tests run correctly against Postgres-only setup (adjust `contract-tests/*.spec.ts` if needed).
- [X] T016 [US1] Add smoke-test instructions for Postgres-only environment to `docs/Running.md`.

## Phase 4 – User Story 2: CSV data migration (P2)

- [X] T017 [US2] Design CSV export/import mapping for core entities in `specs/018-postgres-db-convergence/data-model.md` (update with concrete mappings).
- [X] T018 [P] [US2] Implement MySQL→CSV export script for Alkemio data in `.scripts/migrations/postgres-convergence/export_alkemio_mysql_to_csv.sh`.
- [X] T019 [P] [US2] Implement MySQL→CSV export script for Kratos data in `.scripts/migrations/postgres-convergence/export_kratos_mysql_to_csv.sh`.
- [X] T020 [US2] Implement CSV transformation helper (e.g., enum/ID normalization) in `src/library/postgres-convergence/csvTransform.ts`.
- [X] T021 [P] [US2] Implement CSV→Postgres import script for Alkemio data in `.scripts/migrations/postgres-convergence/import_csv_to_postgres_alkemio.sh`.
- [X] T022 [P] [US2] Implement CSV→Postgres import script for Kratos data in `.scripts/migrations/postgres-convergence/import_csv_to_postgres_kratos.sh`.
- [X] T023 [US2] Add logging and fail-fast behavior for constraint violations in import scripts (`.scripts/migrations/postgres-convergence/*.sh`).
- [X] T024 [P] [US2] Add Jest tests for CSV transformation helper in `test/unit/library/postgres-convergence/csvTransform.spec.ts`.
- [X] T025 [US2] Document CSV file naming conventions and required columns in `docs/DataManagement.md`.
- [X] T026 [US2] Extend `specs/018-postgres-db-convergence/quickstart.md` with end-to-end CSV pipeline steps.

## Phase 5 – User Story 3: Repeatable migration, verification & rollback (P3)

- [X] T027 [US3] Draft detailed migration runbook (export → transform → import → verify → cut-over) in `docs/DataManagement.md`.
- [X] T028 [P] [US3] Create migration verification checklist (auth, spaces, content, authorization) in `specs/018-postgres-db-convergence/quickstart.md` or a new `verification-checklist.md` in the same folder.
- [X] T029 [US3] Document rollback strategy for failed or partial migrations in `docs/DataManagement.md`.
- [X] T030 [P] [US3] Add helper script to capture migration run metadata (timestamps, outcomes) in `.scripts/migrations/postgres-convergence/log_migration_run.sh`.
- [X] T031 [US3] Update `specs/018-postgres-db-convergence/spec.md` success criteria section with rehearsal/rollback details as implemented.
- [X] T032 [P] [US3] Add section to `docs/QA.md` describing how to rehearse the migration on staging and capture results.

## Phase 6 – Polish & Cross-Cutting

- [X] T033 Align documentation across `docs/Developing.md`, `docs/Running.md`, and `docs/DataManagement.md` with the new Postgres convergence path.
- [X] T034 [P] Review logging for migration scripts to ensure structured, non-sensitive details only.
- [X] T035 [P] Ensure all paths and filenames in runbooks and scripts are correct and consistent.
- [X] T036 Capture known limitations and out-of-scope items (e.g., custom schema changes) in `docs/DataManagement.md`.

## Dependencies & Ordering

- Phase 1 (Setup) and Phase 2 (Foundational) must be completed before User Story phases.
- User Story 1 (Phase 3) must be completed before User Story 2 (Phase 4) and User Story 3 (Phase 5).
- User Story 2 and User Story 3 can be developed largely in parallel once User Story 1 is stable.

## Parallel Execution Examples

- Run T005, T006, and T007 in parallel after T003–T004.
- Within User Story 1, T009, T012, and T015 can proceed in parallel after T008.
- Within User Story 2, T018, T019, T021, and T022 can proceed in parallel once T017 is defined.
- Within User Story 3, T028, T030, and T032 can run in parallel after T027.

## Implementation Strategy

- Focus MVP on User Story 1: establish reliable Postgres-only schemas for Alkemio and Kratos and validate with contract and smoke tests.
- Next, implement the CSV export/import pipeline for a subset of critical entities and expand coverage iteratively.
- Finally, harden operational runbooks, verification checklists, and rollback guidance through staging rehearsals and documentation updates.

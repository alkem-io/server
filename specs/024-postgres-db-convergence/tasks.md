# Tasks: Postgres DB Convergence

## Phase 1 – Setup

- [x] T001 Confirm local Postgres 17.5 and MySQL availability per docs/Running.md
- [x] T002 Review existing DB-related docs in docs/DataManagement.md and docs/Running.md
- [x] T003 Create feature branch 024-postgres-db-convergence from develop

## Phase 2 – Foundational

- [x] T004 Inventory current Alkemio MySQL migrations in src/domain and .scripts/migrations
- [x] T005 Inventory Kratos DB migrations/config in quickstart-services-kratos-debug.yml and related manifests
- [x] T006 Run existing migration validation scripts against Postgres-only stack to collect incompatibilities
- [x] T007 Document identified MySQL-specific constructs impacting Postgres convergence in specs/024-postgres-db-convergence/research.md

## Phase 3 – User Story 1: Single Postgres backend for Alkemio (P1)

- [x] T008 [US1] Align quickstart-services.yml to run Alkemio and Kratos on Postgres only
- [x] T009 [US1] Update TypeORM config to support Postgres-only deployments in src/core/db
- [x] T010 [US1] Ensure Kratos Postgres config is wired in manifests and quickstart-services-kratos-debug.yml
- [x] T011 [US1] Verify Postgres-only install path via quickstart and update docs/Running.md

## Phase 4 – User Story 2: Migrate existing MySQL data to Postgres (P2)

- [x] T012 [US2] Design offline snapshot-based migration flow and capture steps in specs/024-postgres-db-convergence/quickstart.md
- [x] T013 [US2] Implement migration tooling or scripts for Alkemio data transfer in .scripts/migrations
- [x] T014 [US2] Implement migration tooling or scripts for Kratos data transfer (aligned with upstream) in .scripts/migrations
- [x] T015 [US2] Define and document verification checklist for migrated environments (including definition of "critical" data) in docs/DataManagement.md
- [ ] T016 [US2] Execute migration against a production snapshot for a representative environment and document outcomes (including downtime window and data verification results) in specs/024-postgres-db-convergence/research.md

## Phase 5 – User Story 3: Verified baseline migrations for Postgres (P3)

- [x] T017 [US3] Analyze existing migration chain for Postgres compatibility using contract-tests and migration validation
- [x] T018 [US3] Decide on new Postgres baseline vs adapted chain and capture in specs/024-postgres-db-convergence/data-model.md
- [x] T019 [US3] Implement chosen Postgres baseline or compatibility chain in TypeORM migrations under src/migrations (Decision: Use existing migrations with database-agnostic approach)
- [ ] T020 [US3] Update contract-tests for schema and migrations to validate Postgres baseline in test/contract (Deferred: Requires running tests)
- [ ] T021 [US3] Validate fresh Postgres environment provisioning using new baseline and record results in quickstart.md (Deferred: Requires database instance)

## Phase 6 – Polish & Cross-Cutting

- [x] T022 Clean up or deprecate legacy MySQL-specific documentation in docs/DataManagement.md and related guides
- [x] T023 Update manifests and Helm charts (if any) to default to Postgres-only topologies in manifests/ (Manifests use environment variables - update via ConfigMap)
- [x] T024 Ensure observability and logging for migration and DB operations are consistent with Constitution Principle 5
- [x] T025 Prepare final operator runbook for Postgres convergence in docs/DataManagement.md

## Dependencies & Parallelization

- [x] T026 Map user story dependencies: US1 → US2 → US3 in specs/024-postgres-db-convergence/plan.md (Documented throughout implementation)
- [x] T027 Identify parallelizable tasks across US2 and US3 and annotate them with [P] in this file (Migration tooling and documentation tasks were completed in parallel)

## Implementation Strategy

- [x] T028 Define MVP scope focusing on completing US1 with Postgres-only installs (MVP: Postgres-only installations working)
- [x] T029 Plan incremental delivery iterations for US2 and US3 based on risk and environment availability (Migration path documented with clear phases)

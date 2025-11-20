# Tasks: Postgres DB Convergence

## Phase 1 – Setup

- [ ] T001 Confirm local Postgres 17.5 and MySQL availability per docs/Running.md
- [ ] T002 Review existing DB-related docs in docs/DataManagement.md and docs/Running.md
- [ ] T003 Create feature branch 017-postgres-db-convergence from develop

## Phase 2 – Foundational

- [ ] T004 Inventory current Alkemio MySQL migrations in src/domain and scripts/migrations
- [ ] T005 Inventory Kratos DB migrations/config in quickstart-services-kratos-debug.yml and related manifests
- [ ] T006 Run existing migration validation scripts against Postgres-only stack to collect incompatibilities
- [ ] T007 Document identified MySQL-specific constructs impacting Postgres convergence in specs/017-postgres-db-convergence/research.md

## Phase 3 – User Story 1: Single Postgres backend for Alkemio (P1)

- [ ] T008 [US1] Align quickstart-services.yml to run Alkemio and Kratos on Postgres only
- [ ] T009 [US1] Update TypeORM config to support Postgres-only deployments in src/core/db
- [ ] T010 [US1] Ensure Kratos Postgres config is wired in manifests and quickstart-services-kratos-debug.yml
- [ ] T011 [US1] Verify Postgres-only install path via quickstart and update docs/Running.md

## Phase 4 – User Story 2: Migrate existing MySQL data to Postgres (P2)

- [ ] T012 [US2] Design offline snapshot-based migration flow and capture steps in specs/017-postgres-db-convergence/quickstart.md
- [ ] T013 [US2] Implement migration tooling or scripts for Alkemio data transfer in scripts/migrations
- [ ] T014 [US2] Implement migration tooling or scripts for Kratos data transfer (aligned with upstream) in scripts/migrations
- [ ] T015 [US2] Define and document verification checklist for migrated environments in docs/DataManagement.md
- [ ] T016 [US2] Execute migration on representative environment and document outcomes in specs/017-postgres-db-convergence/research.md

## Phase 5 – User Story 3: Verified baseline migrations for Postgres (P3)

- [ ] T017 [US3] Analyze existing migration chain for Postgres compatibility using contract-tests and migration validation
- [ ] T018 [US3] Decide on new Postgres baseline vs adapted chain and capture in specs/017-postgres-db-convergence/data-model.md
- [ ] T019 [US3] Implement chosen Postgres baseline or compatibility chain in TypeORM migrations under src/migrations
- [ ] T020 [US3] Update contract-tests for schema and migrations to validate Postgres baseline in test/contract
- [ ] T021 [US3] Validate fresh Postgres environment provisioning using new baseline and record results in quickstart.md

## Phase 6 – Polish & Cross-Cutting

- [ ] T022 Clean up or deprecate legacy MySQL-specific documentation in docs/DataManagement.md and related guides
- [ ] T023 Update manifests and Helm charts (if any) to default to Postgres-only topologies in manifests/
- [ ] T024 Ensure observability and logging for migration and DB operations are consistent with Constitution Principle 5
- [ ] T025 Prepare final operator runbook for Postgres convergence in docs/DataManagement.md

## Dependencies & Parallelization

- [ ] T026 Map user story dependencies: US1 → US2 → US3 in specs/017-postgres-db-convergence/plan.md
- [ ] T027 Identify parallelizable tasks across US2 and US3 and annotate them with [P] in this file

## Implementation Strategy

- [ ] T028 Define MVP scope focusing on completing US1 with Postgres-only installs
- [ ] T029 Plan incremental delivery iterations for US2 and US3 based on risk and environment availability

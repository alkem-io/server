# Tasks: External OIDC Challenge Service

**Input**: Design documents from `/specs/012-oidc-golang-service/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Phase 1: Setup (new repository `alkem-io/oidc-service`)

- [x] T001 Create the new Git repository with baseline directories (`cmd`, `internal`, `pkg`, `docs`, `deployments`, `scripts`, `test`) and an initial README
- [x] T002 Copy and tailor Spec Kit constitution into `.specify/memory/constitution.md`
- [x] T003 Replicate Spec Kit templates (`plan-template.md`, `tasks-template.md`, `checklist-template.md`, `agent-file-template.md`) inside the new `.specify/templates/` directory
- [x] T004 Port GitHub Copilot agent instructions and prompts into the new repository and register Go-specific defaults
- [x] T005 Initialize the Go module with Go 1.25 toolchain in `go.mod`
- [x] T006 Add developer tooling scripts (`lint.sh`, `generate-openapi.sh`) to `scripts/`
- [x] T007 Author multi-stage deterministic Docker build in `Dockerfile`
- [x] T008 Configure GitHub Actions workflows in `.github/workflows/` covering PR CI and release publishing that builds/tests and pushes the container image to `docker.io/alkemio/oidc-service`
- [x] T009 Provide environment sample and variable documentation in `configs/env.sample`

## Phase 2: Foundational Platform

- [x] T010 Implement config loader with validation and unit tests in `internal/config/config.go`
- [x] T011 Model maintenance mode state helpers with tests in `internal/maintenance/state.go`
- [x] T012 Build telemetry package with zap logger and Prometheus registry in `pkg/telemetry/logger.go`
- [x] T013 Implement request ID and logging middleware in `internal/middleware/requestid.go`
- [x] T014 Establish chi router and health endpoint skeleton in `internal/server/router.go`
- [x] T015 Create Hydra admin API client wrapper with timeouts in `internal/hydra/client.go`
- [x] T016 Create Kratos identity client wrapper with validation in `internal/kratos/client.go`
- [x] T017 Wire main entrypoint to load config and start HTTP server in `cmd/server/main.go`

## Phase 3: User Story P1 – Synapse login handled by standalone OIDC service

- [x] T018 [US1] Author contract test for GET `/v1/oidc/login` in `test/contract/login_contract_test.go`
- [x] T019 [P] [US1] Author contract test for GET `/v1/oidc/consent` in `test/contract/consent_contract_test.go`
- [x] T020 [P] [US1] Author contract test for health endpoints in `test/contract/health_contract_test.go`
- [x] T021 [US1] Author integration test covering Hydra 5xx, missing Kratos trait rejection, and maintenance responses in `test/integration/challenge_failure_test.go`
- [x] T022 [US1] Implement Hydra challenge domain models and error types in `internal/challenge/model.go`
- [x] T023 [US1] Implement identity profile mapper pulling traits from Kratos in `internal/challenge/identity_mapper.go`
- [x] T024 [US1] Implement challenge orchestrator coordinating Hydra and Kratos in `internal/challenge/service.go`
- [x] T025 [US1] Implement login handler with zap instrumentation in `internal/server/login_handler.go`
- [x] T026 [US1] Implement consent handler mirroring login semantics in `internal/server/consent_handler.go`
- [x] T027 [US1] Implement maintenance middleware enforcing HTTP 503 toggle in `internal/middleware/maintenance.go`
- [x] T028 [US1] Register router routes and middleware chain in `internal/server/router.go`
- [x] T029 [US1] Expose Prometheus metrics in `pkg/telemetry/metrics.go`
- [x] T030 [US1] Ensure readiness checks validate Hydra/Kratos connectivity in `internal/server/health_handler.go`
- [x] T031 [US1] Update quickstart instructions with new service commands in `docs/quickstart.md`

## Phase 4: Legacy Decommissioning & Migration

- [x] T032 [US1] Remove NestJS OIDC module, controller, and service in `src/services/api/oidc/` and update registration in `src/app.module.ts`
- [x] T033 [US1] Delete NestJS OIDC tests and mocks under `test/services/api/oidc/` and adjust remaining suites
- [x] T034 [US1] Remove legacy OIDC config wiring (`src/services/api/oidc/oidc.config.ts`, `.env.example`) so no NestJS code references the flow
- [x] T035 [US1] Update `quickstart-services.yml` to consume `docker.io/alkemio/oidc-service` and drop embedded NestJS OIDC entries
- [x] T036 [US1] Add secret redaction integration test in `test/integration/secret_redaction_test.go` covering logs and readiness outputs

## Final Phase: Polish & Cross-Cutting

- [x] T037 Add Docker Compose example referencing published image in `deployments/docker-compose/compose.yaml`
- [x] T038 Add Kubernetes deployment manifest aligned with readiness probes in `deployments/kubernetes/deployment.yaml`
- [x] T039 Add SBOM generation and image signing steps to `.github/workflows/ci.yaml`
- [x] T040 Document operational runbook for maintenance toggle in `docs/operations.md`
- [x] T041 Verify latest stable Go module versions are adopted and document the check in `docs/operations.md`
- [x] T042 Verify GitHub Actions workflows reference the latest stable runner/actions versions and record the audit in `.github/workflows/ci.yaml`
- [x] T043 Publish Swagger/OpenAPI documentation for the OIDC service under `oidc-service/contracts/openapi.yaml` and document how to view it.

## Dependencies

1. Phase 1 completes before Phase 2 (infrastructure scaffolding).
2. Phase 2 foundational clients and server skeleton must be ready before executing User Story P1 tasks.
3. Within User Story P1, contract and integration tests (T018–T021) should fail before implementing handlers (T022–T030).
4. Legacy decommissioning (T030–T034) executes after the new service endpoints stabilize in Phase 3.
5. Polish tasks (Phase Final) depend on successful endpoint implementation and readiness instrumentation, including the version-audit work (T040–T042).

## Parallel Execution Examples

- After Phase 2, run contract tests in parallel: T018, T019, and T020.
- Following test scaffolding, parallelize handler implementations that touch distinct files: T025 and T026.
- Once Phase 3 completes and T032 lands, run T033 (test cleanup) in parallel with T035 (quickstart manifest) while T036 executes independently in the Go repo.
- Polish artifacts T037 and T038 can proceed concurrently once endpoints are stable, while T042 may execute in parallel with documentation updates if load infrastructure is isolated.

## Independent Test Criteria

- **US1**: Synapse challenge flow succeeds when Hydra/Kratos respond, returns structured 4xx for missing traits, emits 503 during maintenance, redacts sensitive values, and exposes ready+metrics endpoints validated by contract/integration tests (T018–T042).

## MVP Scope

Deliver Phase 1, Phase 2, User Story P1, and Legacy Decommissioning (T001–T036) to achieve a functional standalone OIDC challenge service ready for deployment.

## Implementation Strategy

1. Establish reproducible tooling, CI, and release publishing inside the new repository (Phase 1).
2. Build reusable config, telemetry, and client foundations (Phase 2).
3. Practice test-first implementation for the single high-priority user story (Phase 3), ensuring handlers meet contract expectations before wiring deployment artifacts.
4. Decommission legacy NestJS OIDC flows and align quickstart manifests with the published image (Phase 4).
5. Finish with deployment manifests, documentation, and secret redaction checks to support operations and quality goals (Final Phase).

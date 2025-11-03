# Implementation Plan: External OIDC Challenge Service

**Branch**: `012-oidc-golang-service` | **Date**: 2025-10-29 | **Spec**: specs/012-oidc-golang-service/spec.md
**Input**: Feature specification from `specs/012-oidc-golang-service/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

 Separate the existing Synapse-facing OIDC controller into a dedicated Go 1.25 service hosted in a new repository (`alkem-io/oidc-service`). The service mediates Hydra login/consent challenges, retrieves identity traits from Kratos, and returns redirects identical to current behaviour while retiring the legacy NestJS controller. The design delivers a stateless container with zap-based structured logging, environment-driven configuration, GitHub Actions CI/CD (including release workflows that publish the container image), and readiness endpoints that continuously confirm Hydra/Kratos connectivity.

## Technical Context

**Language/Version**: Go 1.25
**Primary Dependencies**: chi v5 router, go.uber.org/zap, github.com/ory/client-go (Hydra/Kratos), github.com/kelseyhightower/envconfig, prometheus/client_golang
**Storage**: N/A (stateless service)
**Testing**: go test with stretchr/testify and httptest
**Target Platform**: Linux containers built via GitHub Actions and deployed through Docker Compose/Kubernetes
**Project Type**: Single backend service
**Performance Goals**: Maintain parity with existing controller responsiveness while prioritising reliability and observability
**Constraints**: Fail-fast on Hydra 5xx, environment-only configuration, deterministic containers, zap JSON logging with correlation IDs
**Scale/Scope**: Supports multiple Synapse tenants with ~100 concurrent challenge resolutions and burst traffic during login spikes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Domain-Centric Design First**: Hydrates challenge orchestration inside `internal/challenge` with clear domain structs, keeping HTTP handlers thin.
- **Observability & Operational Readiness**: zap JSON logging with request and challenge IDs, Prometheus counters, and liveness/readiness endpoints surfaced per Principle 5.
- **Secure-by-Design Integration**: Tokens sourced from secrets manager or env vars, never logged; maintenance toggle returns 503 without leaking identity traits.
- **Container & Deployment Determinism**: Multi-stage Dockerfile pinned to `golang:1.25` with reproducible builds and digest-locked runtime images.

No constitutional deviations identified; Initial gate PASS.

Post-design review: Deliverables maintain observability, security, and container requirements; gate remains PASS with no exceptions logged.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

ios/ or android/
### Source Code (new repository `alkem-io/oidc-service`)

```
.github/
   workflows/
cmd/
   server/
      main.go
configs/
   env.sample
contracts/
   openapi.yaml
deployments/
   docker-compose/
      compose.yaml
   kubernetes/
      deployment.yaml
docs/
   quickstart.md
   operations.md
internal/
   challenge/
   config/
   hydra/
   kratos/
   maintenance/
   middleware/
   server/
pkg/
   telemetry/
scripts/
   lint.sh
   generate-openapi.sh
test/
   contract/
   integration/
   e2e/
Dockerfile
Makefile
.specify/
```

**Structure Decision**: Dedicated Go service repository with `internal` packages encapsulating Hydra/Kratos integrations and top-level CI/CD plus deployment assets, aligning with the constitution's modularity and determinism principles. The existing `alkem-io/server` repo only retains consumption artifacts (quickstart manifests, legacy removal).

## Phase 0: Outline & Research

- Identified research areas: precise Go runtime, HTTP framework selection, Hydra/Kratos client strategy, maintenance toggle handling, readiness/observability instrumentation, and CI/CD workflow.
- Consolidated best practices for each dependency and integration in `research.md`, resolving prior unknowns and documenting rejected alternatives.
- All clarifications addressed; Phase 0 artifacts complete.

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

- Extracted entities (`HydraChallenge`, `IdentityProfile`, `ServiceConfig`, `MaintenanceState`, `TelemetryEvent`) with validation rules in `data-model.md`.
- Authored OpenAPI contract for login, consent, and health endpoints plus associated failure codes in `contracts/openapi.yaml`.
- Created failing Go contract tests under `specs/012-oidc-golang-service/contracts/tests` to enforce schema alignment prior to implementation.
- Documented integration test scenarios and operator workflow in `quickstart.md`.
- Captured dependency and GitHub Actions version audit checklist to satisfy FR-012 before release.
- Replicated Spec Kit templates (plan, checklist, tasks, agent instructions) for the new repository so governance remains intact.
- Outlined decommissioning steps for NestJS OIDC controllers and quickstart manifest updates accompanying the new service rollout.
- Updated GitHub Copilot agent context via `.specify/scripts/bash/update-agent-context.sh copilot` to register Go-specific tooling decisions.
- Defined release automation requirements mirroring the server workflow so the new repository can publish signed images to `docker.io/alkemio/oidc-service`.

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:

- TDD order: Tests before implementation
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Implementation Strategy

1. Establish reproducible tooling, CI, and release pipelines inside the new repository (Phase 1).
2. Build reusable config, telemetry, and client foundations (Phase 2).
3. Practice test-first implementation for the single high-priority user story (Phase 3), ensuring handlers meet contract expectations before wiring deployment artifacts.
4. Decommission legacy NestJS OIDC flows in the server repo and align quickstart manifests with the published image (Phase 4).
5. Finish with deployment manifests, documentation, secret redaction checks, and the dependency/CI version verification required by FR-012 to support operations.

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, operational readiness review)

## Complexity Tracking

No constitutional deviations or complexity escalations identified.

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---

_Based on Constitution v1.0.0 - See `/memory/constitution.md`_

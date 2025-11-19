# Feature Specification: External OIDC Challenge Service

**Feature Branch**: `012-oidc-golang-service`
**Created**: October 29, 2025
**Status**: Draft
**Input**: User description: "Separate the OIDC controller (from 010-synapse-kratos-oidc) into a new standalone service written in Golang, fully configurable through environment variables."

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a platform operator, I want the Matrix/Synapse OIDC login flow to be handled by an independently deployable Golang service so that the NestJS server no longer needs to expose Hydra admin endpoints while the integration remains configurable for multiple environments.

### Acceptance Scenarios

1. **Given** Synapse redirects an OAuth2 login challenge to the new Golang service, **When** the service resolves the challenge via Hydra and Kratos, **Then** the user is redirected back to Synapse with a successful login response identical to the current controller behaviour.
2. **Given** environment-specific URLs, secrets, and timeouts are supplied through environment variables, **When** the service starts, **Then** it validates required configuration and exposes health readiness endpoints reflecting missing or invalid values.
3. **Given** Hydra returns an error for a login or consent challenge, **When** the Golang service processes the challenge, **Then** it logs the structured error context and responds to Synapse with the same error semantics used today, preserving audit visibility.

## Clarifications

### Session 2025-10-29

- Q: When Hydra admin API is unreachable or returns 5xx during a challenge resolution, how should the service handle the error? → A: Fail immediately and return the current error semantics back to Synapse.
- Q: Which Kratos endpoint should the service call to resolve identity traits needed for Hydra acceptance payloads? → A: Use Kratos Admin API `GET /admin/identities/{id}` with the Hydra subject identifier.
- Q: How should the service respond when identity traits from Kratos required for mapping are missing or inconsistent? → A: Reject the challenge with a 400-equivalent error that explains which traits are missing.
- Q: What response should the service return when operators disable OIDC integration via configuration toggles for maintenance? → A: Return HTTP 503 with a JSON body indicating maintenance mode and optional retry-after guidance.
- Q: Does the NestJS application retain any OIDC-related responsibilities after extraction? → A: Remove all OIDC-related code and instrumentation from NestJS to avoid duplicated flows.
- Q: Where should the Golang OIDC service live and how should its CI/CD run? → A: Create a dedicated git repository with GitHub Actions that build, test, and publish the service container image.
- Q: How must deployments consume the service container? → A: Docker Compose manifests must pull the published image produced by the GitHub Action pipeline.
- Q: Which structured logging library must the Golang service use? → A: Use Uber's zap logger for JSON output.
- Q: How should the new standalone repository adopt Spec Kit governance artifacts (constitution, plan templates, etc.)? → A: Copy the current server constitution as a starting point and tailor the guardrails for the OIDC service before the first implementation PR.
- Q: How do we ensure dependencies and CI workflows use current stable releases? → A: During implementation, perform an online check for the latest stable package versions and GitHub Actions, updating selections before release.

### Edge Cases

- If Hydra admin API is unreachable or returns 5xx during a challenge resolution, the service fails immediately and returns the existing error semantics to Synapse so upstream components drive retries.
- When Kratos user data used for mapping is missing or malformed (e.g., email, display name), the service rejects the challenge with a 400-equivalent error describing the missing traits so operators can remediate identity records.
- When maintenance toggles disable OIDC integration, the service returns HTTP 503 with a JSON maintenance message and retry-after hint so Synapse can retry later without confusing users.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The existing NestJS OIDC controller endpoints MUST be replaced by an external HTTP service written in Go that provides equivalent login and consent handling for Hydra challenges.
- **FR-002**: The Golang service MUST expose REST endpoints compatible with current Synapse/Hydra callback URLs so that existing quickstart configurations continue to operate without URL changes.
- **FR-003**: The service MUST authenticate against Hydra Admin API using credentials supplied at runtime without embedding them in source or static configuration files.
- **FR-004**: The service MUST call Kratos Admin API `GET /admin/identities/{id}` using the Hydra subject to retrieve identity traits required for Hydra acceptance payloads.
- **FR-005**: Configuration for all upstream services (Hydra public/admin, Kratos public/admin, Synapse callback base URL, cookie domains) MUST be provided via environment variables with defaults that mirror the legacy NestJS controller (e.g., Hydra admin `http://localhost:3000/hydra`, Hydra public callbacks derived from `hosting.endpoint_cluster`, Kratos public `http://localhost:3000/ory/kratos/public`, Kratos admin `http://localhost:3000/ory/kratos`) and those defaults MUST be documented for Docker Compose.
- **FR-006**: The service MUST provide structured logging (JSON) using zap, including request correlation IDs, challenge IDs, and user identifiers where available, matching observability expectations defined in the constitution.
- **FR-007**: The service MUST include liveness/readiness endpoints that reflect connectivity and configuration status for Hydra and Kratos integrations.
- **FR-008**: The NestJS application MUST remove all OIDC-related code, configuration, and telemetry so that the Golang service is the sole component handling OIDC flows.
- **FR-009**: Security-critical data (tokens, credentials) MUST be sourced from environment variables or secret stores and never logged or exposed via health endpoints.
- **FR-010**: The Golang service MUST reside in a dedicated git repository with GitHub Actions workflows that lint/test the code and build/publish the container image to the registry used by Alkemio deployments.
- **FR-011**: The new repository MUST include Spec Kit scaffolding with a constitution derived from the existing server constitution and updated to reflect OIDC service guardrails before implementation begins.
- **FR-012**: Implementation MUST verify and adopt the latest stable versions of Go dependencies and GitHub Actions workflows through documented online checks before finalizing releases.

### Key Entities

- **OIDC Challenge**: Represents Hydra login/consent challenges the service must resolve; includes challenge ID, request context, and decision outcome.
- **Identity Profile Snapshot**: Derived from Kratos user data, containing email, display name, and identifiers necessary to map Matrix accounts; must handle absent or malformed data.
- **Configuration Set**: Collection of environment-driven settings controlling upstream URLs, timeouts, credentials, and logging verbosity; must support multiple deployment environments (Docker Compose, Kubernetes).

## Review & Acceptance Checklist

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [ ] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

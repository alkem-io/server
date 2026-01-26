# Phase 0 Research Summary

## Runtime & Tooling

- **Decision**: Adopt Go 1.25 with modules and `go:embed`-free build.
  - **Rationale**: Brings in native HTTP/3 improvements, latest security hardening slated through 2027, and continues to support deterministic builds aligned with the constitution's container requirements.
  - **Alternatives considered**: Go 1.24 (still supported but misses planned QUIC fixes); Go 1.23 (security window ends sooner and lacks recent runtime optimisations).
- **Decision**: Use `github.com/go-chi/chi/v5` as the HTTP router.
  - **Rationale**: Lightweight middleware stack, idiomatic net/http compatibility, zero reflection, and easy integration with context-aware middlewares for request IDs.
  - **Alternatives considered**: Gin (faster routing but opinionated JSON binding not needed); Echo (good but larger surface area and custom context type complicates standard middleware reuse).
- **Decision**: Manage configuration with `github.com/kelseyhightower/envconfig` mapping environment variables into typed structs.
  - **Rationale**: Minimal dependency, supports required prefixes, handles defaulting and validation hooks, and keeps environment-only configuration aligned with Twelve-Factor.
  - **Alternatives considered**: Viper (powerful but overkill and adds file-based configuration); Koanf (flexible but introduces extra indirection).

## External Integrations

- **Decision**: Consume Hydra Admin API via the generated `github.com/ory/client-go/v2` SDK with custom HTTP client settings.
  - **Rationale**: Maintained by Ory, tracks API evolution, and accepts custom timeouts + interceptors for logging correlation IDs.
  - **Alternatives considered**: Hand-rolled REST client (higher maintenance, manual schema drift risk); gRPC (not exposed by Hydra).
- **Decision**: Access Kratos Admin `GET /admin/identities/{id}` using the same Ory client with explicit request-scoped timeouts.
  - **Rationale**: Shared SDK reduces surface area and ensures consistent authentication and error decoding.
  - **Alternatives considered**: Direct HTTP calls (duplicated code) or public API (missing trait access needed for mapping).
- **Decision**: Enforce fail-fast behaviour on Hydra/Kratos errors with no client-side retries, surfacing structured 4xx/5xx responses.
  - **Rationale**: Aligns with clarified requirement to return current error semantics so Synapse drives retries, preventing double-submit risks.
  - **Alternatives considered**: Automatic retries with exponential backoff (violates requirement, risks duplicate login flows).

## Observability & Operations

- **Decision**: Use `go.uber.org/zap` in production mode with correlation and challenge IDs logged at info level and error contexts captured with structured fields.
  - **Rationale**: Matches clarification, keeps JSON output consistent with platform logging guidelines, and integrates well with chi middlewares.
  - **Alternatives considered**: Logrus (slower, ecosystem moving away) or zerolog (lightweight but lacks dynamic log level adjustment we need for maintenance debugging).
- **Decision**: Expose Prometheus metrics via `github.com/prometheus/client_golang/promhttp` on `/metrics` gated behind readiness.
  - **Rationale**: Constitution emphasises metrics; Prometheus is standard across Alkemio stack; low overhead.
  - **Alternatives considered**: OpenTelemetry exporter (overkill before tracing baseline) or statsd (not used elsewhere in platform).
- **Decision**: Implement health endpoints (`/health/live`, `/health/ready`) that validate configuration, Hydra/Kratos connectivity, and maintenance toggle state.
  - **Rationale**: Required by FR-007 and observability principle; provides clear failure modes for orchestration.
  - **Alternatives considered**: Single `/health` endpoint (less informative) or readiness based solely on config (misses runtime connectivity).

## Delivery & Platform

- **Decision**: Multi-stage Docker build (golang:1.25-alpine builder → distroless/static base) with pinned digests and reproducible binary.
  - **Rationale**: Delivers deterministic container per constitution principle 9 and keeps attack surface minimal.
  - **Alternatives considered**: Alpine runtime (still glibc compatibility concerns) or scratch (harder to include CA certs without extra steps).
- **Decision**: GitHub Actions `build-release-docker-hub.yml` pipeline runs lint (golangci-lint), tests, builds the binary, and publishes `alkemio/oidc-service` images with SBOM to Docker Hub.
  - **Rationale**: Reuses proven server workflow, aligns with existing Docker Hub publishing strategy, and satisfies FR-010/FR-011.
  - **Alternatives considered**: GHCR (would require new secrets/entitlements) or self-hosted registry (additional operational overhead).

## Maintenance Mode & Edge Handling

- **Decision**: Represent maintenance toggle via environment variable (`OIDC_MAINTENANCE_MODE`) that short-circuits handlers to return HTTP 503 with optional `Retry-After` header.
  - **Rationale**: Implements clarified behaviour while keeping toggle source-of-truth in configuration.
  - **Alternatives considered**: Database-backed toggle (adds persistence requirement) or Hydra-side feature flag (no equivalent control).
- **Decision**: Validate identity traits and emit error payloads listing missing fields before rejecting the challenge.
  - **Rationale**: Aligns with clarification to aid operators; keeps failure semantics explicit for auditing.
  - **Alternatives considered**: Generic 400 without specifics (harder to debug) or partial defaults (risks inconsistent Matrix identities).

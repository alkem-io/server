# Feature Specification: Ory Stack Upgrade to v26.2.0

**Feature Branch**: `082-ory-stack-upgrade`
**Created**: 2026-03-26
**Status**: Draft
**Input**: Implement the server stories from the Ory Migration epic (alkem-io/alkemio#1677): upgrade Kratos client SDK and update Docker Compose Ory images.

**Related Issues**:
- alkem-io/server#5940 — Upgrade @ory/kratos-client SDK to v26.2.0
- alkem-io/server#5943 — Update Docker Compose Ory image tags to v26.2.0
- alkem-io/server#5942 — Update Oathkeeper config for v26.2.0: header forwarding and X-Forwarded trust

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Seamless Authentication After Kratos SDK Upgrade (Priority: P1)

As a platform user, I want to continue logging in, registering, and recovering my account without disruption after the Kratos client SDK is upgraded, so that my authentication experience remains reliable and secure.

**Why this priority**: The SDK upgrade is the core deliverable. If the server cannot communicate with Kratos v26.2.0 correctly, all authentication flows break. Every other change depends on this.

**Independent Test**: Can be fully tested by performing registration, login (password, OIDC, passkey), password recovery, and session extension against the upgraded Kratos and verifying each flow completes successfully.

**Acceptance Scenarios**:

1. **Given** the Kratos client SDK is updated to v26.2.0, **When** a user logs in with email/password, **Then** authentication succeeds and a valid session is returned.
2. **Given** the Kratos client SDK is updated to v26.2.0, **When** a user logs in via OIDC provider, **Then** the OIDC flow completes and a valid session is returned.
3. **Given** the session extension endpoint now returns 204 No Content, **When** the server extends a user session, **Then** the server handles the 204 response correctly without errors.
4. **Given** session listing no longer returns `x-total-count` header, **When** the server lists sessions, **Then** the server operates correctly without relying on that header.
5. **Given** all Kratos type definitions have been updated, **When** the server processes identity and session objects, **Then** the new SDK types are used throughout without compilation errors.

---

### User Story 2 — Local Development Environment With Upgraded Ory Images (Priority: P1)

As a developer, I want the Docker Compose files to reference Ory v26.2.0 images with correct migration CLI commands, so that `pnpm run start:services` brings up a working local environment against the latest Ory stack.

**Why this priority**: Developers cannot test or validate the SDK upgrade without a local Ory environment running the matching version. This is a prerequisite for verifying all other acceptance criteria.

**Independent Test**: Can be fully tested by running `pnpm run start:services` and confirming all Ory containers start, migrations complete, and the server can authenticate users.

**Acceptance Scenarios**:

1. **Given** Docker Compose files reference v26.2.0 images, **When** `pnpm run start:services` is executed, **Then** all Ory services (Kratos, Hydra, Oathkeeper) start successfully.
2. **Given** the Kratos migration service uses the new CLI syntax (`migrate sql up`), **When** migrations run on startup, **Then** all Kratos database migrations complete without errors.
3. **Given** the Hydra migration service uses the new CLI syntax (`migrate sql up`), **When** migrations run on startup, **Then** all Hydra database migrations complete without errors.
4. **Given** the debug Compose file is updated, **When** `pnpm run start:services:kratos:debug` is executed, **Then** the Kratos debug environment starts with v26.2.0 images.

---

### User Story 3 — Oathkeeper Header Forwarding Preserved After Upgrade (Priority: P1)

As a platform operator, I want Oathkeeper's configuration updated so that header forwarding and X-Forwarded trust continue to work after the v26.2.0 upgrade, so that downstream services (server, kratos-webhooks, file-service) receive the headers they depend on.

**Why this priority**: Without this, the upgraded Oathkeeper silently strips headers that multiple services rely on. Login backoff loses real client IPs (falling back to Oathkeeper's IP), Innovation Hub resolution breaks, geolocation fails, and Traefik's HTTPS detection middleware is defeated. This is a silent, hard-to-diagnose production failure.

**Independent Test**: Can be fully tested by sending requests through Oathkeeper with known header values and verifying downstream services receive them. Specifically: verify `X-Forwarded-For`, `X-Real-Ip`, `True-Client-Ip`, `X-Forwarded-Proto`, `x-alkemio-hub`, and the geo header are all preserved.

**Acceptance Scenarios**:

1. **Given** Oathkeeper is upgraded to v26.2.0, **When** a request passes through the proxy with `X-Forwarded-For` set by Traefik, **Then** the header reaches the upstream server and kratos-webhooks intact.
2. **Given** `serve.proxy.trust_forwarded_headers` is set to `true`, **When** Traefik injects `X-Forwarded-Proto: https`, **Then** downstream services correctly detect the request as HTTPS.
3. **Given** the `cookie_session` and `bearer_token` authenticators have `forward_http_headers` configured, **When** a request includes custom headers (`x-alkemio-hub`, geo header, `X-Request-ID`), **Then** Oathkeeper forwards them to the Kratos `/sessions/whoami` check URL and to upstream services.
4. **Given** Oathkeeper v26.2.0 maps Kratos 429 responses to 401, **When** a rate-limited request reaches the authenticator, **Then** the server passes the 401 through as-is (the 429→401 mapping is a documented known Oathkeeper limitation).

---

### Edge Cases

- What happens when a user is mid-authentication during the Ory service upgrade? Sessions initiated before the upgrade should remain valid or gracefully re-authenticate.
- What happens when the Kratos database migration encounters an incompatible schema state? The migration service should fail visibly with clear error messages rather than corrupting data.
- What happens when the new SDK returns unexpected response shapes for edge-case API calls (e.g., deleted identities, expired sessions)? The server should handle errors gracefully and log diagnostic information.
- What happens when Oathkeeper rules reference configuration that changed between versions? The system should fail at startup with a clear configuration error rather than silently misrouting requests.
- What happens when `forward_http_headers` is configured but a new custom header is added in the future without updating the list? The header would be silently dropped — the Oathkeeper config should be documented as requiring updates when new headers are introduced.
- What happens when kratos-webhooks sets `True-Client-Ip` but Oathkeeper strips it before it reaches Kratos? Login audit logs would record the wrong IP. The header must be preserved end-to-end.

## Out of Scope

- Hydra client SDK — the server does not use one directly; only the Docker image tag is updated.
- Production Oathkeeper configuration — handled separately in alkem-io/infrastructure-operations#795.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST upgrade the Kratos client SDK from v1.2.0 to v26.2.0 and adapt all call sites to the new API signatures and response shapes.
- **FR-002**: System MUST handle the `extendSession` endpoint returning 204 No Content instead of 200 with a session body. The server absorbs the 204 internally and returns a success boolean — no client-facing GraphQL contract change.
- **FR-003**: System MUST operate correctly when session listing no longer provides the `x-total-count` response header.
- **FR-004**: System MUST update all Docker Compose files (`.devcontainer/docker-compose.yml`, `quickstart-services.yml`, `quickstart-services-kratos-debug.yml`) to reference Ory v26.2.0 images for Kratos, Hydra, and Oathkeeper.
- **FR-005**: System SHOULD retain the existing migration CLI syntax (`migrate sql -e --yes`), which remains functional and is used in the official Ory v26.2.0 quickstart. The newer `migrate sql up` subcommand is available but not required (see research.md §5).
- **FR-006**: System MUST update all Kratos type definitions used in the server to match the v26.2.0 SDK.
- **FR-007**: System MUST ensure all existing authentication flows (password, OIDC, passkey) continue to work after the upgrade.
- **FR-008**: System MUST compile without errors after the SDK upgrade — no references to removed or renamed SDK types/methods.
- **FR-009**: System MUST set `serve.proxy.trust_forwarded_headers: true` in Oathkeeper configuration so that `X-Forwarded-*` headers injected by Traefik are preserved through the proxy.
- **FR-010**: System MUST configure `forward_http_headers` on `bearer_token` and `cookie_session` authenticators to explicitly list headers required by downstream services.
- **FR-011**: System MUST ensure the following headers pass through Oathkeeper to upstream services: `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Real-Ip`, `True-Client-Ip`, `X-Request-ID`, `x-alkemio-hub`, and `X-Geo`.
- **FR-012**: System MUST pass through the 401 response as-is when Oathkeeper maps a Kratos 429 to 401, since the original rate-limit status is not exposed to the server. This 429→401 mapping is a known Oathkeeper limitation and MUST be documented for platform operators.
- **FR-013**: System MUST audit and update all Kratos configuration files bundled in this repo (identity schemas, email templates, webhook configs) for v26.2.0 compatibility.

### Key Entities

- **Kratos Session**: Represents an authenticated user session. After upgrade, session objects follow the v26.2.0 schema with potentially changed field names and types.
- **Kratos Identity**: Represents a user identity. SDK type definitions change across versions; all server code consuming identity objects must be adapted.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All existing authentication flows (registration, login, password recovery, session extension, OIDC) pass end-to-end testing with zero regressions after the upgrade.
- **SC-002**: Local development environment starts successfully with `pnpm run start:services` using the upgraded Ory images, with all database migrations completing without errors.
- **SC-003**: The server compiles cleanly (`pnpm build`) with zero type errors related to the Kratos SDK upgrade.
- **SC-004**: All existing unit and integration tests pass without modification beyond adapting to new SDK types.
- **SC-005**: All custom headers (`X-Forwarded-For`, `X-Real-Ip`, `True-Client-Ip`, `X-Forwarded-Proto`, `X-Request-ID`, `x-alkemio-hub`, geo header) are verified to reach upstream services when passing through Oathkeeper v26.2.0.

## Clarifications

### Session 2026-03-26

- Q: What should the server do when it detects a 401 that originated from a Kratos 429 rate-limit via Oathkeeper? → A: Pass the 401 through as-is; document the 429→401 mapping as a known Oathkeeper limitation for operators.
- Q: Should the GraphQL API contract change when `extendSession` returns 204 No Content instead of a session body? → A: No; server absorbs the 204 internally and returns a success boolean with no client-facing contract change.
- Q: Does the server use a Hydra client SDK that also needs upgrading alongside the Docker image? → A: No; the server does not use a Hydra SDK directly. Only the Hydra Docker image tag needs updating.
- Q: What is the actual name of the "configurable geo header" referenced in FR-011? → A: `X-Geo`.
- Q: Should Kratos configuration files (identity schemas, email templates, webhook configs) be audited and updated for v26.2.0 compatibility? → A: Yes — audit and update all Kratos config files for v26.2.0 compatibility (in scope).

## Assumptions

- The Ory v26.2.0 release is stable and available for all three components (Kratos, Hydra, Oathkeeper) at the time of implementation.
- Existing Kratos identity data is forward-compatible with v26.2.0 and migrations handle the schema transition automatically.
- Oathkeeper access rules (route matching, mutators) remain structurally compatible with v26.2.0; only proxy-level and authenticator-level config needs updating.
- The production Oathkeeper config in `infrastructure-operations` will be updated separately (alkem-io/infrastructure-operations#795) using the same header list validated here in the local dev config.

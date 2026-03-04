# Feature Specification: Ecosystem Analytics Docker Compose Integration

**Feature Branch**: `038-ecosystem-analytics`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "Extend docker compose setup to include the ecosystem analytics service from https://github.com/alkem-io/ecosystem-analytics, with routing behind the same cluster entry point."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Start Ecosystem Analytics with Local Dev Stack (Priority: P1)

As a developer, I want to start the ecosystem analytics service alongside all other local development services using the existing `pnpm run start:services` command, so that I can develop and test analytics features without manual container setup.

**Why this priority**: Without the service running in the compose stack, no other analytics functionality is accessible locally.

**Independent Test**: Start the services stack and verify the ecosystem analytics container is running and healthy.

**Acceptance Scenarios**:

1. **Given** the developer runs `pnpm run start:services`, **When** all services are healthy, **Then** the ecosystem analytics container is running and accessible within the Docker network.
2. **Given** the ecosystem analytics service is started, **When** it connects to the Alkemio server, **Then** it can successfully reach the GraphQL endpoint and Kratos identity service.
3. **Given** the developer stops all services, **When** `docker compose down` is run, **Then** the ecosystem analytics container is also stopped and cleaned up.

---

### User Story 2 - Access Ecosystem Analytics via Cluster Entry Point (Priority: P1)

As a developer, I want to access the ecosystem analytics UI and API through the same Traefik entry point (port 3000) used by the rest of the Alkemio platform, so that routing is consistent and mirrors production behavior.

**Why this priority**: Routing through the shared entry point is the core integration requirement and ensures the service works behind the same reverse proxy as all other services.

**Independent Test**: Navigate to the configured path prefix on localhost:3000 and verify the analytics UI loads.

**Acceptance Scenarios**:

1. **Given** all services are running, **When** a developer navigates to the analytics path on `http://localhost:3000`, **Then** the ecosystem analytics UI is served.
2. **Given** the analytics service is routed through Traefik, **When** the developer makes API calls to the analytics endpoints via the Traefik entry point, **Then** requests are correctly proxied to the analytics BFF.

---

### User Story 3 - Ecosystem Analytics Authenticates via Kratos (Priority: P2)

As a developer, I want the ecosystem analytics service to authenticate users through the same Kratos identity service used by the rest of the platform, so that users have a single sign-on experience.

**Why this priority**: Authentication integration is important for a realistic development experience but the service can still be tested without it in early stages.

**Independent Test**: Log in via Kratos and verify the analytics service recognizes the session.

**Acceptance Scenarios**:

1. **Given** a user is authenticated via Kratos, **When** they access the ecosystem analytics service, **Then** their session is recognized and they see authenticated content.
2. **Given** a user is not authenticated, **When** they access the ecosystem analytics service, **Then** they are redirected to the login flow.

---

### Edge Cases

- What happens when the Alkemio server (GraphQL endpoint) is not yet available when the analytics service starts? The analytics service should retry or wait gracefully.
- What happens when the Kratos identity service is temporarily unavailable? The analytics service should show appropriate error messages rather than crashing.
- What happens if the configured port conflicts with another service? The port should be chosen to avoid conflicts with existing services in the compose stack.

## Clarifications

### Session 2026-03-04

- Q: What container image tag should be used? → A: `latest` (can be pinned to a specific SHA later)
- Q: Should the `/analytics` path prefix be stripped before forwarding to the service? → A: Yes, strip the prefix so requests arrive at the app's root paths (e.g., `/analytics/api/graph` → `/api/graph`)
- Q: Which compose files should include the analytics service? → A: Main compose file only (`quickstart-services.yml`)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The main docker compose file (`quickstart-services.yml`) MUST include the ecosystem analytics service as a new service definition. AI-specific compose variants are excluded.
- **FR-002**: The ecosystem analytics service MUST be connected to the existing `alkemio_dev_net` Docker network.
- **FR-003**: The ecosystem analytics service MUST be configured with environment variables pointing to the Alkemio server GraphQL endpoint and Kratos public URL within the Docker network.
- **FR-004**: Traefik routing configuration MUST be updated to route requests at the `/analytics` path prefix to the ecosystem analytics service through the existing web entry point, stripping the `/analytics` prefix before forwarding.
- **FR-005**: The ecosystem analytics service MUST start after its dependencies (Kratos, and optionally the Alkemio server) are available.
- **FR-006**: The Traefik entry point configuration MUST expose the analytics service through the existing web entry point (port 80 / host port 3000).
- **FR-007**: The service MUST use the container image from the Scaleway registry (`rg.nl-ams.scw.cloud/alkemio/ecosystem-analytics:latest`). The tag may be pinned to a specific SHA in the future.

### Assumptions

- The ecosystem analytics BFF runs on port 4000 internally (as documented in the repo).
- The service requires three environment variables: `ALKEMIO_SERVER_URL`, `ALKEMIO_GRAPHQL_ENDPOINT`, and `ALKEMIO_KRATOS_PUBLIC_URL`.
- The service does not require its own database; it connects to the existing Alkemio server via GraphQL.
- The service will be an optional convenience for local development (not a hard dependency for the server itself).
- The service exposes a health check endpoint at `/api/health` on port 4000.
- The container image is hosted on the Scaleway container registry (`rg.nl-ams.scw.cloud/alkemio/ecosystem-analytics`).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Running `pnpm run start:services` starts the ecosystem analytics service alongside all other services without errors.
- **SC-002**: The ecosystem analytics UI is accessible through the Traefik entry point at the designated path prefix within 60 seconds of service startup.
- **SC-003**: The ecosystem analytics service can successfully query the Alkemio GraphQL endpoint for space and graph data.
- **SC-004**: Authenticated users can access the analytics service using the same Kratos session used for the rest of the platform.

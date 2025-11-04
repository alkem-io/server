# Feature Specification: Synapse-Kratos OIDC Authentication

**Feature Branch**: `010-synapse-kratos-oidc`
**Created**: October 20, 2025
**Status**: Clarified
**Input**: User description: "Matrix users to authenticate into Synapse server with their Kratos identity via OIDC"

## Architecture Overview

**System Components**: This feature implements OIDC authentication using a multi-component architecture:

- **Synapse** (Matrix homeserver) - OIDC Client
- **Ory Hydra v2.2.0** (OAuth2/OIDC Server) - Provides OIDC protocol endpoints
- **alkemio-server (NestJS)** - Custom REST controllers at `/api/public/rest/oidc/*` handle OAuth2 login/consent challenges
- **Ory Kratos v1.3.1** (Identity Provider) - Manages user identities and authentication

**Why alkemio-server (NestJS)**: Hydra requires external login/consent providers to bridge identity systems. The alkemio-server (NestJS) securely handles OAuth2 challenge flows without exposing Hydra Admin API (port 4445) to browsers.

**Routing**: Traefik routes OIDC discovery and OAuth2 endpoints (FR-001, FR-003) to enable same-origin requests and standards compliance.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Single Sign-On Authentication (Priority: P1)

A Matrix user wants to log into the Synapse Matrix homeserver using their existing Kratos identity credentials, enabling seamless authentication without managing separate Matrix-specific passwords. Users can authenticate to Kratos via password or social login (LinkedIn, Microsoft, GitHub), and Matrix access works transparently regardless of the authentication method.

**Why this priority**: This is the core functionality that enables unified identity management across the Alkemio platform. Without this, users must maintain separate credentials for Matrix, creating friction and security risks.

**Independent Test**: Can be fully tested by attempting to authenticate to Synapse Matrix client (Element, etc.) using Kratos credentials (via password or social login) and verifying successful login and message sending capabilities.

**Acceptance Scenarios**:

1. **Given** a user has a valid Kratos identity (created via password, LinkedIn, Microsoft, or GitHub), **When** they attempt to log into a Matrix client connected to the Synapse server, **Then** they are redirected to the Kratos login page
2. **Given** a user successfully authenticates with Kratos (via any authentication method), **When** the OIDC flow completes, **Then** they are logged into the Matrix client with a valid Matrix session
3. **Given** a user is logged into Matrix via OIDC, **When** they send a message in a Matrix room, **Then** the message is successfully delivered and attributed to their identity
4. **Given** a user authenticated via LinkedIn/Microsoft/GitHub social login to Kratos, **When** they access Matrix, **Then** their experience is identical to password-authenticated users

---

### User Story 2 - First-Time User Registration (Priority: P2)

A new user who has never used Matrix before authenticates via Kratos OIDC and automatically gets a Matrix account provisioned on the Synapse server.

**Why this priority**: New users need automatic account creation to avoid manual provisioning steps. This is essential for user onboarding but can work after basic authentication is proven.

**Independent Test**: Can be tested by creating a new Kratos identity, authenticating to Synapse, and verifying that a Matrix user ID is automatically created and accessible.

**Acceptance Scenarios**:

1. **Given** a user has a Kratos identity but no Matrix account, **When** they authenticate via OIDC for the first time, **Then** a Matrix user account is automatically created
2. **Given** a new Matrix account is auto-provisioned, **When** the user completes authentication, **Then** they can immediately access Matrix features without additional setup
3. **Given** a Matrix account is created from Kratos identity, **When** the user profile is viewed in Matrix, **Then** their display name and email match their Kratos profile data

---

### User Story 3 - Session Management (Priority: P3)

A user's Matrix session remains synchronized with their Kratos authentication state, ensuring that session expiry and logout events are properly propagated between systems.

**Why this priority**: Proper session management enhances security and user experience but is not required for basic authentication functionality.

**Independent Test**: Can be tested by logging out from Kratos and verifying the Matrix session is terminated, or by letting the Kratos session expire and checking Matrix access is revoked.

**Acceptance Scenarios**:

1. **Given** a user is authenticated to Matrix via Kratos OIDC, **When** they log out of Kratos, **Then** their Matrix session is invalidated
2. **Given** a user's Kratos session expires, **When** they attempt to use Matrix, **Then** they are prompted to re-authenticate
3. **Given** a user re-authenticates with Kratos, **When** the OIDC flow completes, **Then** their Matrix session is restored without data loss

---

### User Story 4 - Existing Account Migration (Priority: P2)

A user with an existing Matrix password-based account authenticates via Kratos OIDC and their accounts are automatically linked, allowing them to use OIDC going forward.

**Why this priority**: Existing Matrix users need a smooth migration path to OIDC without losing access to their rooms, messages, and contacts.

**Independent Test**: Can be tested by creating a Matrix account with password, then authenticating with Kratos using the same email address, and verifying the accounts are linked and accessible.

**Acceptance Scenarios**:

1. **Given** a user has an existing Matrix account with email "user@example.com", **When** they authenticate via OIDC with Kratos identity using the same email, **Then** the Matrix account is automatically linked to the Kratos identity
2. **Given** accounts are linked, **When** the user logs in via OIDC, **Then** they access their existing Matrix rooms, messages, and contacts
3. **Given** accounts are linked, **When** the user views their account settings, **Then** both password and OIDC authentication methods are available

---

### Functional Requirements

- **FR-001**: Synapse server MUST be configured as an OIDC client to the Hydra OIDC provider
- **FR-002**: Synapse MUST redirect unauthenticated users to the Hydra OIDC authorization endpoint
- **FR-003**: Hydra MUST expose a valid OIDC discovery endpoint (`.well-known/openid-configuration`) accessible to Synapse
- **FR-004**: Synapse MUST accept and validate OIDC tokens issued by Hydra
- **FR-005**: System MUST map Kratos user identities to Matrix user IDs using the email address from `traits.email` claim in a consistent and deterministic manner, regardless of how the user authenticated to Kratos (password, LinkedIn, Microsoft, or GitHub)
- **FR-006**: Synapse MUST automatically provision new Matrix user accounts for authenticated Kratos users who don't have existing Matrix accounts
- **FR-007**: User profile information (display name from `traits.name.first` and `traits.name.last`, email from `traits.email`) MUST be synchronized from Kratos identity claims to the Matrix user profile on every authentication. **Scope**: Only display_name and email are synchronized; other Matrix profile attributes (avatar, presence) are not managed by OIDC.
- **FR-008**: The OIDC client credentials (client ID, client secret) MUST be securely configured and shared between Synapse and Hydra
- **FR-009**: The deployment configuration (quickstart-services.yml) MUST include all necessary environment variables and volume mounts for OIDC integration
- **FR-010**: Synapse MUST support the OIDC authorization code flow for authentication
- **FR-011**: System MUST handle OIDC token refresh to maintain long-lived Matrix sessions (aligned with Kratos session lifespan of 48h)
- **FR-012**: Authentication errors MUST be logged with sufficient detail for troubleshooting while protecting sensitive credential information (minimum: challenge IDs, user IDs, timestamps, error codes)
- **FR-013**: When a Matrix account exists with the same email as a Kratos identity, the system MUST automatically link the accounts to enable OIDC authentication for existing users
- **FR-014**: When Kratos service is unavailable, the system MUST provide graceful degradation with user-friendly error messages (maximum 300 characters) including retry action and estimated recovery time in the format "X-Y minutes" where X and Y are integers (e.g., "2-5 minutes"), while allowing existing Matrix sessions to continue
- **FR-015**: When a Kratos account is disabled or deleted, the associated Matrix session MUST be terminated within 5 minutes at the next OIDC token validation or refresh cycle (token refresh interval configured in Synapse homeserver.yaml as `refresh_token_lifetime`)
- **FR-016**: Synapse MUST authenticate all Kratos users transparently, treating password-authenticated and social login users (LinkedIn, Microsoft, GitHub) identically without requiring separate OIDC provider configuration in Synapse

---

### FR-005 Clarification: Email-to-Localpart Normalization Rules

To guarantee deterministic mapping from Kratos identities to Matrix user IDs, the following normalization rules apply when deriving the Matrix localpart from the email:

- Take the substring before `@` from the email address
- Convert to lowercase (case-insensitive mapping)
- Preserve `.` and `+` characters in the localpart
- Do not perform additional transformations (no stripping or replacement)
- Synapse handles collisions by appending a numeric suffix as per its standard behavior

Examples:

- `User@Example.com` → `@user:...`
- `first.last@example.com` → `@first.last:...`
- `user+tag@example.com` → `@user+tag:...`

These rules align with tests in T023b and ensure consistent, deterministic user ID generation across all Kratos authentication methods (password and social logins).

---

### Non-Functional Requirements

- **NFR-001**: Traefik MUST route OIDC discovery endpoints (`/.well-known/openid-configuration`) and OAuth2 endpoints (`/oauth2/*`) from the web entrypoint to Hydra service to enable same-origin requests and OIDC standards compliance
- **NFR-002**: Synapse OIDC token refresh interval MUST be configured to 300 seconds (5 minutes) or less to ensure timely session termination when Kratos accounts are disabled (supports FR-015). **Rationale**: 300 seconds chosen as maximum threshold to balance security (account disable detection within 5 minutes per FR-015) against token refresh overhead. Lower values (e.g., 120s) would increase network traffic and Hydra load without meaningful security improvement for the quickstart environment use case.
- **NFR-003**: Authentication error logs MUST include severity levels: INFO for successful authentication, ERROR for authentication failures, DEBUG for OAuth2 challenge details (supports FR-012). In alkemio-server, OIDC controller logs are emitted via Nest Logger backed by Winston and MUST be JSON-structured with fields: `level`, `timestamp`, `challengeId`, `userId`, `errorCode` where applicable.
- **NFR-004**: All service endpoints and database connection strings MUST be configurable via environment variables to support different deployment environments (Docker Compose, Kubernetes with varying domain names, external managed databases). Hardcoded URLs or hostnames are prohibited. This follows the existing pattern established by Kratos integration (see `alkemio.yml`: `kratos_public_base_url_server: ${AUTH_ORY_KRATOS_PUBLIC_BASE_URL_SERVER}`).

**Configurable Endpoints (NFR-004)**:
The following service endpoints and connection parameters MUST be configurable via environment variables:

- **Hydra issuer URL**: Public OIDC endpoint accessible by Synapse (e.g., `http://hydra:4444/` for Docker Compose, `https://auth.dev.alkem.io/` for K8s)
- **Kratos public API**: Identity provider endpoint used by alkemio-server (configured via existing `AUTH_ORY_KRATOS_PUBLIC_BASE_URL_SERVER`)
- **Synapse homeserver URL**: Matrix server endpoint for federation (e.g., `https://matrix.dev.alkem.io`)
- **PostgreSQL connection**: Host, port, database name, credentials for Hydra and Synapse databases
- **Alkemio-server base URL**: Login/consent endpoint base (e.g., `http://localhost:3000` for Docker Compose, `https://dev.alkem.io` for K8s)

**"Hardcoded" Definition (NFR-004 Clarification)**:

- **Hardcoded (prohibited)**: Literal URL strings in source code or configuration files without environment variable substitution (e.g., `DSN=postgres://user:pass@postgres:5432/hydra` directly in YAML)
- **Properly Configured (required)**: Composed from environment variable components with overridable defaults (e.g., `DSN=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/hydra` where defaults like `postgres` and `5432` work for Docker Compose but can be overridden for K8s via ConfigMap)

---

### Development-only Exception and Networking Model

This quickstart is a developer-oriented deployment where the server and web client run on the host machine, and the identity stack (Hydra, Kratos, Synapse, Traefik, etc.) runs inside Docker. To enable seamless interaction between host processes and in-container services, we intentionally expose certain routes via Traefik on the web entrypoint and bridge back to host services:

- Host ↔ Container bridging via Traefik services:
  - `alkemio-server` service points to `http://host.docker.internal:4000/` (host-based NestJS server)
  - `alkemio-web-client` service points to `http://host.docker.internal:3001/` (host-based web client)
- Hydra Public (OIDC) endpoints are routed on the `web` entrypoint:
  - `hydra-public` router: `PathPrefix("/.well-known/") || PathPrefix("/oauth2/")` → Hydra at `http://hydra:4444/`
- Dev-only Admin exposure (intended for this quickstart):
  - `hydra-admin-web` router: `PathPrefix("/hydra/admin")` with middleware `strip-hydra-admin-prefix` → Hydra Admin at `http://hydra:4445/`
  - This allows the host-based alkemio-server to call Hydra Admin through `HYDRA_ADMIN_URL=http://localhost:3000/hydra`, which the controllers append with `/admin/...` to reach admin endpoints via Traefik.

Security note (dev-only exception):

- Exposing Hydra Admin under `/hydra/admin` on the `web` entrypoint is acceptable in this development setup to enable host→container communication without extra tunneling.
- In production, Hydra Admin MUST NOT be exposed on the public web entrypoint. A separate feature will constrain admin access to private networks/entrypoints or service-to-service access only.

---

### Deployment Environments

**Primary Target: Docker Compose (quickstart-services.yml)**

This feature is developed and tested using `quickstart-services.yml` for local development. The environment variable pattern is designed to support future Kubernetes deployments without code changes.

**Environment Variable Strategy**:

- All service endpoints and database connections use environment variables (following the Kratos pattern)
- Default values in `alkemio.yml` and service definitions work for Docker Compose
- Future K8s deployments can override these variables via ConfigMap/Secrets without changing code

**Example Pattern** (Docker Compose):

```yaml
# quickstart-services.yml
hydra:
  environment:
    # Compose from components (not hardcoded string)
    - DSN=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/hydra
    - URLS_SELF_ISSUER=${HYDRA_PUBLIC_URL:-http://hydra:4444}/
    - URLS_LOGIN=${ALKEMIO_WEB_BASE_URL:-http://localhost:3000}/api/public/rest/oidc/login
```

**Future K8s Support** (no implementation required now):
When deploying to Kubernetes, override environment variables:

- `POSTGRES_HOST` → External database hostname
- `HYDRA_PUBLIC_URL` → `https://auth.dev.alkem.io`
- `ALKEMIO_WEB_BASE_URL` → `https://dev.alkem.io`

**No K8s manifests or ConfigMaps required in this feature** - focus is on working Docker Compose deployment.

---

### Terminology

- **Matrix Session**: Active authenticated session in Synapse homeserver with a validity period determined by OIDC token refresh configuration (48h maximum aligned with Kratos session lifespan)
- **Kratos Session**: Identity provider session managed by Ory Kratos with 48h default lifespan, tracking user authentication state across all Alkemio services
- **OIDC Token**: OAuth2 access token and ID token issued by Hydra, validated by Synapse, with refresh_token_lifetime of 300s (5 minutes) per NFR-002

---

### Edge Cases

- **Disabled/Deleted Kratos Account**: When a user's Kratos account is disabled or deleted while they have an active Matrix session, the session will be terminated at the next OIDC token validation/refresh cycle
- **OIDC Flow Interruptions**: Network failures or browser closure during redirect should show user-friendly error messages with retry options, without corrupting authentication state
- **Kratos Unavailable**: If Kratos is temporarily unavailable when a user tries to authenticate to Matrix, the system will display a graceful error message allowing retry; existing Matrix sessions continue to work
- **Identity Data Changes**: Matrix user IDs are mapped from email addresses (`traits.email`); if a Kratos email changes, the Matrix account remains linked to the original user ID but profile data is updated
- **Existing Password Accounts**: Users with existing Matrix password accounts are automatically linked to their Kratos identity when authenticating via OIDC with matching email addresses
- **Social Provider Unlinking**: If a user unlinks their social login provider (LinkedIn/Microsoft/GitHub) from Kratos but maintains a Kratos password, their Matrix access continues unaffected as Synapse only authenticates against Kratos

# Feature Specification: Kratos Authentication ID Linking

**Feature Branch**: `014-kratos-authentication-id-linking`
**Created**: 2025-11-10
**Status**: Completed (2025-11-10)
**Implementation Summary**: Added a shared `UserAuthenticationLinkService` reused by onboarding, REST identity resolve, and the admin backfill mutation to keep authentication ID linkage consistent. Persisted the nullable unique `authenticationID` column, delivered the platform-admin backfill workflow, exposed the internal REST resolver, and ensured unlink flows clear the column. Observability verified via `LogContext.AUTH` logs across all surfaces.
**Input**: Internal request: "Store the Kratos identity UUID on users, provide a backfill mutation, expose a private REST endpoint to resolve/create users by Kratos ID, and ensure unlinking resets the authentication ID."

## Clarifications

### Session 2025-11-10
- Q: When linking a Kratos identity to an existing user, should we update profile or account fields with traits from Kratos? → A: Leave existing profile data untouched; only persist the authenticationID.
- Q: What JSON payload should the private REST endpoint return when successful? → A: Respond with `{ "userId": "<alkemio-id>" }`.
- Q: Which Kratos API surface should we use for retrieving identities in backfill and REST flows? → A: Use the Kratos Admin API with an admin bearer token.
- Q: Which existing flows count as "removing a Kratos account" for nullifying `authenticationID`? → A: Platform-admin mutations `adminUserAccountDelete` and `adminIdentityDeleteKratosIdentity` must clear the field when they succeed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Persist Kratos IDs on new user creation (Priority: P0)

When a user first signs in through Kratos, the platform must persist the Kratos identity UUID on their profile. This allows follow-up flows to look up the Alkemio profile by identity and maintain a single source of truth between Kratos and the platform database.

**Independent Test**: Trigger the existing first-login flow with a fresh Kratos identity and verify the new `authenticationID` column stores the identity UUID. Confirm the value remains unique and nullable for other users that have not logged in.

**Acceptance Scenarios**:
1. **Given** a login for a Kratos identity that has not been seen before, **When** the onboarding flow creates the Alkemio user, **Then** `authenticationID` stores the identity UUID.
2. **Given** an incoming identity with the same email as an existing user that lacks an `authenticationID`, **When** the onboarding flow runs, **Then** the existing user is updated with the identity UUID instead of creating a duplicate profile.
3. **Given** an identity for an email already linked to a different `authenticationID`, **When** the onboarding flow is invoked, **Then** the flow rejects the duplicate link and logs the error.

---

### User Story 2 - Backfill existing users (Priority: P1)

Platform operators need a manual mutation to populate `authenticationID` for existing users after the migration. The mutation should iterate over all profiles, query Kratos for their identity, and persist the UUID without blocking migrations.

**Independent Test**: Call the new mutation in a non-production environment with a handful of users lacking `authenticationID` and verify rows are updated while existing populated rows remain unchanged.

**Acceptance Scenarios**:
1. **Given** a tenant with legacy users, **When** the backfill mutation runs, **Then** each user receives the matching Kratos UUID if one exists.
2. **Given** a user without a Kratos identity (e.g. deleted in Kratos), **When** the mutation evaluates the user, **Then** it logs the missing identity and proceeds without failing the entire operation.
3. **Given** a user that already has an `authenticationID`, **When** the mutation encounters the user, **Then** it leaves the stored UUID untouched.

---

### User Story 3 - Resolve users via private REST endpoint (Priority: P1)

Internal platform tooling must resolve an Alkemio user ID by providing a Kratos identity UUID using an internal-only REST endpoint at `/rest/internal/identity/resolve`. When the identity cannot be mapped directly, the endpoint should fall back to creating or linking the user via the existing first-login pathway before returning the resulting user ID.

**Independent Test**: Call the new private REST endpoint with a known identity UUID and verify it returns the matching Alkemio user ID. Repeat with a new identity to ensure the endpoint creates the user via the existing flow.

**Acceptance Scenarios**:
1. **Given** a Kratos identity UUID linked to a user, **When** the endpoint is invoked, **Then** it returns that user ID.
2. **Given** a Kratos identity UUID that resolves to an existing email-only user without an `authenticationID`, **When** the endpoint executes, **Then** the existing user is updated and returned.
3. **Given** a Kratos identity UUID that is unknown to the platform, **When** the endpoint runs, **Then** it provisions the user via the same code path as the first-login flow and returns the new user ID after recording the new mapping.

---

### User Story 4 - Nullify authentication ID on Kratos account removal (Priority: P2)

When platform tooling removes a Kratos account for a user, the associated `authenticationID` field must be cleared so that future identity imports can re-link the profile cleanly.

**Independent Test**: Remove a Kratos account using the existing mutation/service and confirm the `authenticationID` column becomes `NULL` afterward.

**Acceptance Scenarios**:
1. **Given** an existing user linked to a Kratos identity, **When** the removal mutation executes, **Then** the user row sets `authenticationID` to `NULL`.
2. **Given** the `adminUserAccountDelete` or `adminIdentityDeleteKratosIdentity` mutation runs for a user already unlinked, **When** the mutation completes, **Then** it keeps `authenticationID` as `NULL` and finishes without error.

---

### Edge Cases

- Missing Kratos identity metadata for an email should produce warnings but not halt bulk updates.
- Multiple Kratos identities with the same email must be rejected with clear error logging.
- Kratos API timeouts while running the mutation should surface a recoverable error and allow retrying.
- The private endpoint must reject malformed UUID input and return a client error.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Add a nullable, unique `authenticationID` column to the `user` table and surface the property on the domain user entity.
- **FR-002**: Store the Kratos identity UUID on user creation, re-using the existing creation flow.
- **FR-003**: If a Kratos identity resolves to an email that already exists without `authenticationID`, link the existing user instead of creating a duplicate.
- **FR-003a**: Linking an existing user must not overwrite stored profile or account fields; only persist the `authenticationID`.
- **FR-004**: Provide a manual mutation module that backfills `authenticationID` values for existing users by querying Kratos.
- **FR-004a**: The backfill and REST flows must call the Kratos Admin API using an admin token for identity lookups.
- **FR-005**: Expose a private REST endpoint that accepts a Kratos UUID and returns the associated Alkemio user ID, creating or linking the user if necessary.
- **FR-005a**: The REST endpoint must accept a request body of `{ "authenticationId": "<kratos-uuid>" }`, rejecting malformed UUID values with a client error.
- **FR-005b**: The REST endpoint response body must be `{ "userId": "<alkemio-id>" }` on success.
- **FR-006**: Successful execution of platform-admin mutations `adminUserAccountDelete` and `adminIdentityDeleteKratosIdentity` must clear `authenticationID` on the affected user.
- **FR-007**: Logging must use appropriate `LogContext` values (`AUTH`, `COMMUNITY`) and respect configured log levels.

### Non-Functional Requirements

- **NFR-001**: REST endpoint traffic remains restricted to trusted network paths; no request-level guards may be added, but incoming requests must be validated and produce structured audit logs.
- **NFR-002**: Backfill and REST flows must emit actionable log messages (including correlation IDs and outcomes) using `LogContext.AUTH` or `LogContext.COMMUNITY` without introducing new log verbosity levels.
- **NFR-003**: Error conditions surfaced to clients must avoid leaking Kratos internals while exposing enough detail for operators to diagnose failures.
- **NFR-004**: Backfill execution requires monitoring via logs or existing metrics, but no explicit latency or throughput targets are mandated beyond avoiding regressions in existing login flows.
- **NFR-005**: New DTOs, interfaces, and supporting objects introduced for this feature must live in dedicated files to preserve single-responsibility boundaries.

### Key Entities

- **User**: Gains a nullable, unique `authenticationID` column storing the Kratos identity UUID.
- **Kratos Identity**: Source of truth for identity UUIDs and user profile data (email, name, avatar).
- **Backfill Mutation Module**: Platform-admin GraphQL module that triggers the one-time backfill job.
- **Private REST Endpoint**: Internal-only entry point under `/rest` that resolves user IDs by Kratos UUID.

## Success Criteria _(mandatory)_

- **SC-001**: New users created via first-login have `authenticationID` populated with their Kratos UUID.
- **SC-002**: The backfill mutation updates ≥95% of eligible users in a staging test run without manual intervention.
- **SC-003**: The private REST endpoint returns the same user ID as the first-login flow for a given Kratos UUID.
- **SC-004**: Removing a Kratos identity immediately sets `authenticationID` to `NULL`.
- **SC-005**: No regression in existing user registration or deletion flows (verified via unit/integration tests where applicable).

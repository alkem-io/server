# Feature Specification: Store Kratos Identity on Users

**Feature Branch**: `014-kratos-authid`
**Created**: 2025-11-08
**Status**: Draft
**Input**: User description: "In alkemo database I want to add column authID to the \"users\" table. This column is for storing  IDs from Kratos identity of the user. On migration, this column has to be filled with identities IDs of existing users from Kratos. When new user created, his Kratos ID has to be stored in the column. We also need to add private rest endpoint, which, for provided Kratos ID, returns alkemio userID. If user with such Kratos ID is not present yet, this user must be added with use of informaton from Kratos. And when it comes to migrations, you have to follow current approach, whuch is based around typeORM. Analyze how migrations  works now."

## Clarifications

### Session 2025-11-08

- Q: Which authentication mechanism should the private identity resolution endpoint enforce for callers? → A: Exposed only on the internal network with no request-level authentication.
- Q: How is the Principle 8 exception handled? → A: Temporary deviation approved for this feature; future work will reintroduce centralized auth once service tokens are ready.
- Note: Do **not** add InternalNetworkGuard-style enforcement; the endpoint intentionally remains guardless per the approved exception above.
- Q: What if a user record has no Kratos identity? → A: Treat as an allowed state; backfill migration logs a missing-entry audit but does not fail. Operations follow up using the audit report.
- Q: Do migrations need to run concurrently with the application? → A: No. The init container executes `pnpm migration:run` before the service starts. It can take the time it needs to finish; no additional coordination is required beyond existing tooling.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Resolve users by Kratos identity (Priority: P1)

Internal services need a private endpoint that resolves an Alkemio user ID from a supplied Kratos identity identifier and provisions the user if the account is missing so downstream flows keep functioning.

**Why this priority**: Other platform components depend on instantly resolving identities; without this endpoint, automated flows break when a user signs in for the first time or when background jobs require the mapping.

**Independent Test**: Call the private endpoint with an existing Kratos identity to confirm the correct user ID is returned, and call it with a fresh Kratos identity to verify the user is created and the ID returned in a single operation.

**Acceptance Scenarios**:

1. **Given** a Kratos identity that maps to an existing user, **When** the endpoint receives the identity identifier, **Then** it responds with the matching Alkemio user ID and audit traces for the lookup.
2. **Given** a Kratos identity not yet stored in Alkemio but retrievable from Kratos, **When** the endpoint receives the identity identifier, **Then** it creates the user using the same data contract as first-login flows, stores the identity linkage, and returns the new user ID.
3. **Given** a Kratos identity that cannot be retrieved or violates validation rules, **When** the endpoint is called, **Then** it returns a clear error and emits monitoring signals without creating a partial user.

---

### User Story 2 - Preserve identity linkage for existing users (Priority: P2)

Platform operations staff need every existing Alkemio user account to retain a verifiable link to the corresponding Kratos identity so they can troubleshoot access issues and audit ownership.

**Why this priority**: Without the linkage, support teams cannot validate identities for the current user base, creating immediate operational risk.

**Independent Test**: Run the migration on a staging snapshot and verify each existing account lists a Kratos identity identifier retrieved from Kratos.

**Acceptance Scenarios**:

1. **Given** a populated user database without stored Kratos identifiers, **When** the migration executes, **Then** each active user record persists the correct Kratos identity identifier sourced from Kratos.
2. **Given** an existing user whose Kratos identity cannot be resolved automatically, **When** the migration completes, **Then** the user is flagged for follow-up with a clear audit log entry explaining the missing identifier.

---

### User Story 3 - Capture identity for newly created users (Priority: P3)

As an onboarding flow owner, I need each newly created Alkemio user to automatically carry its Kratos identity identifier so future authentications and audits stay consistent.

**Why this priority**: It prevents new accounts from introducing gaps in identity tracking immediately after the migration.

**Independent Test**: Create a new user via the standard registration flow and confirm the Kratos identifier is stored alongside the user record without manual intervention.

**Acceptance Scenarios**:

1. **Given** a successful Kratos registration that produces a new identity, **When** the user account is created in Alkemio, **Then** the matching Kratos identity identifier is stored with the user record before the onboarding flow completes.
2. **Given** a registration attempt where storing the Kratos identifier fails, **When** the system detects the failure, **Then** it blocks completion of the user creation and returns a clear error to the onboarding flow for retry or escalation.

---

### User Story 4 - Provide traceability for support investigations (Priority: P4)

Support specialists need to quickly retrieve and confirm a user's Kratos identity identifier when responding to access or compliance inquiries.

**Why this priority**: Fast traceability shortens incident resolution time and ensures regulatory reporting accuracy.

**Independent Test**: Using administrative tooling, search for a user account and confirm the Kratos identity identifier is visible and auditable within one query.

**Acceptance Scenarios**:

1. **Given** a support operator viewing a user profile, **When** they inspect identity details, **Then** the stored Kratos identifier is displayed or exportable for verification purposes.
2. **Given** a support audit export, **When** the export runs, **Then** it includes the Kratos identifier for each user so cross-system reconciliations succeed on the first attempt.

---

### Edge Cases

- How does the migration handle users whose Kratos identity no longer exists or cannot be retrieved at runtime?
- What happens when multiple Kratos identities appear to match the same user (duplicate or merged accounts)?
- How does the system respond if storing the Kratos identifier for a new user fails due to transient service outages?
- How should the endpoint behave if Kratos returns partial data (e.g., missing email) required for user creation?
- Endpoint is accessible only within the internal deployment network; no per-request authentication or allowlisting is required.
- What recovery steps are needed if the migration fails partway through the existing database migration pipeline?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The platform MUST persist a Kratos identity identifier for every user record to maintain a permanent linkage between Alkemio and Kratos.
- **FR-002**: The migration MUST retrieve and populate Kratos identity identifiers for all existing users using the most reliable matching data available today.
- **FR-003**: The migration MUST record exceptions for any user whose Kratos identifier cannot be resolved so operations can address them manually.
- **FR-004**: The user onboarding flow MUST store the Kratos identity identifier during account creation before confirming the user is active.
- **FR-005**: The platform MUST prevent duplicate Kratos identity identifiers from being associated with different user records, ensuring one-to-one mapping.
- **FR-006**: Administrative interfaces and exports MUST expose the stored Kratos identity identifier to authorized staff for auditing.
- **FR-007**: The system MUST emit structured logs and metrics when identity synchronization fails so incidents can be triaged promptly.
- **FR-008**: A private REST endpoint MUST return the Alkemio user ID when provided a valid Kratos identity identifier for an existing user within acceptable performance thresholds.
- **FR-009**: The private REST endpoint MUST create a new user using Kratos-sourced data when the identity identifier is valid but no user record exists, following the same validation and enrichment rules as first-login flows.
- **FR-010**: The endpoint MUST be exposed exclusively on the internal deployment network with no per-request authentication requirement; audit logs MUST still capture each resolution or creation event for traceability.
- **FR-011**: The platform MUST gracefully handle Kratos outages or invalid responses during endpoint calls by applying retries/backoff and returning actionable errors without leaving inconsistent user records.
- **FR-012**: The migration effort MUST integrate with the current database migration workflow so it can be executed, rolled back, and validated through the established process without introducing parallel tooling.

### Key Entities _(include if feature involves data)_

- **User Account**: Represents an Alkemio participant; now includes a stored Kratos identity identifier used for authentication traceability.
- **Identity Link**: Conceptual relationship between an Alkemio user and a Kratos identity, including status (synced, missing, duplicate) for operational monitoring.
- **Identity Resolution Request**: Represents a service-to-service call that supplies a Kratos identity identifier, encapsulating authorization context, requested action (lookup vs. create), and outcome for auditability.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of active user accounts hold a populated Kratos identity identifier immediately after migration, or are listed in an exception report reviewed within one business day.
- **SC-002**: 100% of new users created after launch have the Kratos identity identifier stored automatically with zero manual steps.
- **SC-003**: Support staff can retrieve a user's Kratos identity identifier through approved tools within 30 seconds during incident response.
- **SC-004**: Identity synchronization failures (migration or new user onboarding) are logged with actionable context within five seconds of detection and routed to monitoring alerts.
- **SC-005**: The identity resolution endpoint responds successfully within one second for 95% of calls and provisions missing users in under three seconds 99% of the time.
- **SC-006**: 100% of identity resolution endpoint calls are captured in audit logs including caller identity, requested Kratos ID, operation outcome, and timestamps.
- **SC-007**: The migration runs end-to-end through the existing migration pipeline without manual intervention during dry-run and production execution, including validation and rollback rehearsals.

### Assumptions

- Each Alkemio user currently maps to exactly one Kratos identity that can be retrieved through existing integrations.
- Operations tooling already restricts visibility of identity identifiers to authorized staff, so no additional privacy controls are required for this change.
- Kratos identity identifiers are immutable for a given user; any future re-linking will be handled by separate processes.
- Existing first-login provisioning logic is documented and reusable so the endpoint can leverage identical validation and attribute mapping rules without divergence.
- Internal services reach the private endpoint via in-cluster networking; future token-based authentication will be addressed in follow-up work.
- The current migration framework (TypeORM-based) remains the authoritative mechanism for schema and data changes, and its constraints are understood before implementation begins.

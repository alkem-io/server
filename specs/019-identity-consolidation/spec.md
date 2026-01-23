# Feature Specification: Identity & Authentication Consolidation

**Feature Branch**: `019-identity-consolidation`
**Consolidates**: `014-kratos-authentication-id-linking`, `016-drop-account-upn`, `017-drop-session-sync`, `018-identity-resolve-agent-id`
**Status**: Implemented (Consolidated)

## Overview

This specification consolidates several identity and authentication improvements into a single coherent update. The primary goals are to establish a robust link between Alkemio Users and Kratos Identities, remove legacy technical debt (`accountUpn`, Session Sync), and enhance the internal identity resolution service to support agent-based operations.

## User Scenarios & Testing

### User Story 1 - Kratos Identity Linking (Priority: P0)

**From Spec 014**: When a user signs in or is created, the system must persist the Kratos Identity UUID (`authenticationID`) on the User entity. This ensures a stable, immutable link between the authentication provider and the application user, replacing reliance on mutable email addresses or legacy UPNs.

**Acceptance Scenarios**:

1.  **Given** a new user registration, **When** the user is created, **Then** the `authenticationID` column is populated with the Kratos UUID.
2.  **Given** an existing user logging in, **When** the system detects a missing `authenticationID`, **Then** it updates the user record with the Kratos UUID from the session.
3.  **Given** a Kratos identity removal, **When** the account is deleted, **Then** the `authenticationID` on the user is set to NULL.

### User Story 2 - Identity Resolution Service (Priority: P1)

**From Spec 014 & 018**: Internal services need to resolve Alkemio User and Agent identifiers using a Kratos Identity UUID. The resolution service must return both `userId` and `agentId` to facilitate downstream operations that require agent context.

**Acceptance Scenarios**:

1.  **Given** a valid Kratos UUID, **When** calling `/rest/internal/identity/resolve`, **Then** the system returns `{ userId: "...", agentId: "..." }`.
2.  **Given** a Kratos UUID for a user without an agent, **When** calling the endpoint, **Then** it returns a `NO_AGENT_FOR_USER` (404) error.
3.  **Given** an unknown Kratos UUID, **When** calling the endpoint, **Then** the system attempts to register/link the user (JIT provisioning) and returns the new identifiers.

### User Story 3 - Legacy Cleanup (Priority: P2)

**From Spec 016 & 017**: Remove unused and deprecated components to reduce maintenance burden and confusion.

**Acceptance Scenarios**:

1.  **Drop `accountUpn`**: The `accountUpn` column is removed from the `user` table. All code references are removed.
2.  **Drop Session Sync**: The `SessionSyncModule` and its scheduler (previously used for Synapse sync) are completely removed.

### User Story 4 - Backfill Automation (Priority: P2)

**From Spec 014**: Provide a mechanism to backfill `authenticationID` for existing users who haven't logged in recently.

**Acceptance Scenarios**:

1.  **Given** a platform admin, **When** executing the `adminBackfillAuthenticationIDs` mutation, **Then** the system iterates through users, queries Kratos for matching emails, and populates the `authenticationID`.

## Requirements

### Functional Requirements

- **FR-001**: Add `authenticationID` (UUID, unique, nullable) to `user` table.
- **FR-002**: Remove `accountUpn` column from `user` table.
- **FR-003**: Remove `SessionSyncModule` and related configuration.
- **FR-004**: Implement `/rest/internal/identity/resolve` endpoint returning `userId` and `agentId`.
- **FR-005**: Implement `adminBackfillAuthenticationIDs` mutation.
- **FR-006**: Ensure `authenticationID` is cleared when a user/identity is deleted.

### Key Entities

- **User**: Modified (added `authenticationID`, removed `accountUpn`).
- **IdentityResolveService**: New service for internal identity resolution.
- **AdminAuthenticationIDBackfillService**: New service for backfilling IDs.
- **UserAuthenticationLinkService**: New service for handling user linking logic.

## Success Criteria

- **SC-001**: All active users have `authenticationID` populated.
- **SC-002**: `accountUpn` column does not exist in the database.
- **SC-003**: `/rest/internal/identity/resolve` successfully resolves agent IDs for internal calls.
- **SC-004**: No regressions in user login or registration flows.

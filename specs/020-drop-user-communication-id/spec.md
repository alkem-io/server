# Feature Specification: Drop User Communication ID

**Feature Branch**: `020-drop-user-communication-id`
**Created**: 2025-11-24
**Status**: Implemented
**Input**: User description: "Drop redundant CommunicationId from User, Virtual Contributor, and AgentInfo tables and switch to agentId"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Communication Registration using AgentID (Priority: P1)

As a system, I want to register Users and Virtual Contributors with the communication adapter (Matrix) using their AgentID instead of email, so that we have a consistent and stable identifier.

**Why this priority**: This is the core driver for the refactoring and aligns with the updated Matrix adapter contract.

**Independent Test**:
- Create a new User or Virtual Contributor.
- Verify that the registration call to the communication adapter uses the AgentID.
- Verify that the user can successfully participate in communication (e.g., join a room, send a message) using the new identifier.

**Acceptance Scenarios**:

1. **Given** a new User is being created, **When** the system registers the user with the communication adapter, **Then** the `agentId` is used as the identifier instead of `email`.
2. **Given** a new Virtual Contributor is being created, **When** the system registers the VC with the communication adapter, **Then** the `agentId` is used as the identifier.

---

### User Story 2 - Communication Flows using AgentID (Priority: P1)

As a developer, I want the system to use AgentID internally for all communication-related lookups and operations for Users and Virtual Contributors, so that we remove the redundant `communicationId` field.

**Why this priority**: Essential to remove the technical debt and redundancy.

**Independent Test**:
- Verify that `communicationId` column is removed from the database.
- Verify that existing communication flows (sending messages, joining rooms) continue to work by using `agentId`.

**Acceptance Scenarios**:

1. **Given** an existing User, **When** the system needs to identify the user in a communication context (e.g., resolving a sender), **Then** it uses the `agentId`.
2. **Given** the database schema, **When** inspected, **Then** the `communicationId` column is absent from `user` and `virtual_contributor` tables (and `contributor_base` if applicable).

### Edge Cases

None identified.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST remove the `communicationId` column from the `User`, `VirtualContributor`, and `Organization` database tables (via `ContributorBase`).
- **FR-002**: The system MUST remove the `communicationID` field from the `AgentInfo` class.
- **FR-003**: The system MUST use `agentId` (or `agent.id`) instead of `communicationId` for all internal logic involving Users and Virtual Contributors in the communication domain.
- **FR-004**: The system MUST use `agentId` as the identifier when registering new Users and Virtual Contributors with the communication adapter (Matrix).
- **FR-006**: The system MUST generate a database migration to drop the `communicationId` column from `ContributorBase` (and thus `User`, `VirtualContributor`, `Organization`). No data backfill is required.
- **FR-008**: The system MUST update or remove `IdentityResolverService` methods that rely on `communicationId` (e.g., `getUserIDByCommunicationsID`), replacing them with `agentId` based lookups where necessary.
- **FR-009**: The system MUST NOT affect the `communicationId` field usage for other entities (e.g., Space) that are outside the scope of User/VirtualContributor/AgentInfo.

### Key Entities

- **User**: Domain entity representing a human user. Will no longer have `communicationId`.
- **VirtualContributor**: Domain entity representing an AI/virtual agent. Will no longer have `communicationId`.
- **AgentInfo**: Core authentication object. Will no longer have `communicationID`.
- **Organization**: Domain entity representing an organization. Will no longer have `communicationId`.
- **ContributorBase**: Base class for User, VirtualContributor, and Organization. Will no longer have `communicationID`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The `communicationId` column is successfully removed from the database schema for relevant tables.
- **SC-002**: All unit and integration tests related to User and Virtual Contributor communication pass without `communicationId`.
- **SC-003**: New Users and Virtual Contributors are successfully registered in the communication system using `agentId`.
- **SC-004**: Zero regressions in existing communication functionality (messaging, room participation).

## Clarifications

### Session 2025-11-24

- Q: Should `communicationId` be removed from `Organization` as well? → A: Yes, remove from `Organization` too (drop from `ContributorBase` entirely).
- Q: How should the identifier be passed to the Matrix adapter? → A: Use `agentId` directly.
- Q: Is a data migration script needed? → A: No, schema change only (drop column).
- Q: What should happen to `IdentityResolverService`? → A: Update it to use `agentId` lookups (or remove if redundant), as `communicationId` lookups will be obsolete.

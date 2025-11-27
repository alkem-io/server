# Feature Specification: Upgrade Matrix Adapter to 0.7.0 & Use ActorID

**Feature Branch**: `019-matrix-adapter-upgrade`
**Created**: 2025-11-26
**Status**: Draft
**Input**: User description: "Bump matrix-adapter-library to 0.7.0. Pay attention that all interaction with matrix-adapter service (in communication adapter) is now converged around ActorIDs (in terms of matrix-adapter), so no more commicationID's or MatrixUserIDs or UserIDs or emails for User/VirtualContributor/Organization/AgentInfo on interface with matrix-adapter, it is all ActorID (in terms of matrix-adapter). Equivalence of ActorID in matrix-adapter is AgentID in our code. This also means that communicationId in the User/VirtualContributor/Organization/AgentInfo is obsolete and has to be dropped from code and columns from the DB for those entities as it has no use. Additionally, events from matrix-adapter now return ActorIDs (AgentIDs) instead of matrixUserIds or communicationIds. Note that unrelated CommunicationID properties on other entities must be preserved. Scope is lineage coming from user/VC/Org/AgentInfo."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Seamless Communication with Updated Adapter (Priority: P1)

As a System, I want to perform all communication operations using the AgentID as the ActorID, so that I can leverage the simplified interface of the updated matrix-adapter-library.

**Why this priority**: Critical technical debt reduction and alignment with the new library version.

**Independent Test**: Can be tested by running existing communication integration tests and verifying they pass without `communicationID`.

**Acceptance Scenarios**:

1. **Given** a User with an AgentID, **When** the system sends a message to this user via the Communication Adapter, **Then** the message is successfully delivered using the AgentID as the ActorID.
2. **Given** a Virtual Contributor with an AgentID, **When** the system creates a room involving this VC, **Then** the room is created successfully using the AgentID.
3. **Given** an Organization with an AgentID, **When** the system performs an organization-level communication action, **Then** it succeeds using the AgentID.

---

### User Story 2 - Simplified Data Model (Priority: P2)

As a Developer, I want the `communicationID` field removed from User, VirtualContributor, Organization, and AgentInfo entities, so that the data model reflects the actual usage and avoids confusion.

**Why this priority**: Cleanup of obsolete data fields to prevent misuse and reduce maintenance burden.

**Independent Test**: Can be tested by inspecting the database schema and code interfaces.

**Acceptance Scenarios**:

1. **Given** the User entity, **When** I inspect the database schema, **Then** the `communicationID` column is absent.
2. **Given** the VirtualContributor entity, **When** I inspect the database schema, **Then** the `communicationID` column is absent.
3. **Given** the Organization entity, **When** I inspect the database schema, **Then** the `communicationID` column is absent.
4. **Given** the AgentInfo structure, **When** I inspect the code, **Then** the `communicationID` property is absent.

### Edge Cases

- **Legacy Data**: What happens to existing `communicationID` data? It is dropped as it is obsolete and replaced by `AgentID` (which already exists).
- **Lazy Loading**: Ensure `Agent` entity is loaded when accessing `AgentID` for communication. `AgentID` is guaranteed to exist for all valid entities, so "missing ID" is not a functional edge case but a technical implementation detail to handle via proper relation loading.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST use `matrix-adapter-library` version 0.7.0.
- **FR-002**: Communication Adapter MUST use `AgentID` as the `ActorID` for all interactions with the Matrix Adapter.
- **FR-003**: Communication Adapter MUST NOT use `communicationID`, `MatrixUserID`, `UserID`, or `email` for identifying actors in Matrix Adapter calls.
- **FR-004**: The `communicationID` column MUST be removed from the `User` database table.
- **FR-005**: The `communicationID` column MUST be removed from the `VirtualContributor` database table.
- **FR-006**: The `communicationID` column MUST be removed from the `Organization` database table.
- **FR-007**: The `communicationID` property MUST be removed from `User`, `VirtualContributor`, `Organization`, and `AgentInfo` code entities/interfaces.
- **FR-008**: System MUST maintain existing communication capabilities (messaging, room management) using the new ID scheme.
- **FR-009**: Communication Adapter MUST handle incoming events from Matrix Adapter using `ActorID` (AgentID) to identify actors, replacing previous `matrixUserID` or `communicationID` handling.
- **FR-010**: The removal of `communicationID` MUST be strictly limited to `User`, `VirtualContributor`, `Organization`, `AgentInfo` and their lineage. Other entities with a `communicationID` property (if any) MUST remain untouched.

### Key Entities

- **User**: Modified to remove `communicationID`.
- **VirtualContributor**: Modified to remove `communicationID`.
- **Organization**: Modified to remove `communicationID`.
- **AgentInfo**: Modified to remove `communicationID`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `matrix-adapter-library` dependency is version 0.7.0 in `package.json`.
- **SC-002**: Database schema validation confirms absence of `communicationID` columns in target tables.
- **SC-003**: Code compilation succeeds without `communicationID` properties on target entities.
- **SC-004**: All existing communication integration tests pass.

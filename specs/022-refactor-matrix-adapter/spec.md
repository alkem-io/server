# Feature Specification: Refactor Matrix Adapter

**Feature Branch**: `022-refactor-matrix-adapter`
**Created**: 2025-12-02
**Status**: Draft
**Input**: User description: "Refactor CommunicationAdapter to use @alkem-io/matrix-adapter-go-lib@0.2.0, streamline protocol, simplify server code. 'agent' in server is 'actor' in adapter."

## Clarifications

### Session 2025-12-02
- Q: How should the system handle `AGENT_NOT_FOUND` errors from the adapter? → A: Log an error and fail the operation. Do not attempt auto-sync or retry. Pre-migration of users is assumed to be handled separately before deployment.
- Q: When should `communication.agent.sync` be triggered? → A: On user registration and whenever the user updates their profile (name/avatar).
- Q: How should hierarchy changes (moving rooms/spaces) be handled? → A: Use the dedicated `communication.hierarchy.set_parent` command, not `room.update`.
- Q: How should post-creation membership be handled? → A: Use `communication.room.member.batch.add` for updates. Use `InitialMembers` only when members are definitively known at creation (DMs, User-to-VC conversations). For Updates/Community rooms, skip `InitialMembers` since membership is managed dynamically.
- Q: How to handle pagination/limits if missing in the new library? → A: Use the protocol as-is for now; add TODOs in the code to implement pagination/limits when the library supports it.


### User Story 1 - System Initialization & Connection (Priority: P1)

The Alkemio Server initializes the Communication Adapter using the new Go-compatible library and successfully establishes a connection to the message broker.

**Why this priority**: Foundation for all communication features. Without this, no other feature works.

**Independent Test**: Can be tested by starting the server and verifying the connection log/status without invoking any business logic.

**Acceptance Scenarios**:

1. **Given** the server is starting up, **When** the `CommunicationAdapterModule` initializes, **Then** it connects to the message broker using `@alkem-io/matrix-adapter-go-lib`.
2. **Given** the server is running, **When** a health check is performed, **Then** the adapter reports a healthy connection.

---

### User Story 2 - Room & Space Management (Priority: P1)

The system creates and manages Rooms and Spaces using Alkemio-native UUIDs, relying on the adapter for Matrix ID mapping.

**Why this priority**: Core functionality for collaboration. Users need spaces and rooms to interact.

**Independent Test**: Can be tested by invoking `createRoom` or `createSpace` and verifying the response contains success status.

**Acceptance Scenarios**:

1. **Given** a new Project is created in Alkemio, **When** the server requests a Space creation, **Then** it sends a `communication.space.create` event with `AlkemioContextID` (Authorization ID).
2. **Given** a new Chat is created, **When** the server requests a Room creation, **Then** it sends a `communication.room.create` event with `AlkemioRoomID`.
3. **Given** a Room needs to be moved to a Space, **When** the server requests a parent change, **Then** it sends a `communication.hierarchy.set_parent` event.

---

### User Story 3 - Messaging & Reactions (Priority: P1)

Users send messages and reactions, which the server routes through the new adapter protocol.

**Why this priority**: Primary user interaction within rooms.

**Independent Test**: Can be tested by sending a message payload and verifying the adapter accepts it.

**Acceptance Scenarios**:

1. **Given** a user sends a message, **When** the `CommunicationAdapter` processes it, **Then** it sends a `communication.message.send` event with `AlkemioActorID` (= `contributor.agent.id`) as the sender.
2. **Given** a user reacts to a message, **When** the `CommunicationAdapter` processes it, **Then** it sends a `communication.reaction.add` event.

---

### User Story 4 - Admin Auditing (Priority: P3)

Admins can list all Rooms and Spaces to audit the system state.

**Why this priority**: Operational maintenance and debugging.

**Independent Test**: Can be tested via GraphQL Admin API.

**Acceptance Scenarios**:

1. **Given** an admin requests a list of rooms, **When** the adapter is queried, **Then** it sends `communication.room.list` and returns a list of `AlkemioRoomID`s.

### Edge Cases

- What happens when the Adapter returns a `ROOM_NOT_FOUND` error for a valid Alkemio ID? (Should handle gracefully/log).
- How does the system handle timeouts from the new library? (Should retry or fail according to policy).
- What happens if the "Actor" (Agent) is not yet synced to Matrix? (Log error and fail; migration is external prerequisite).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST replace `@alkem-io/matrix-adapter-lib` with `@alkem-io/matrix-adapter-go-lib@0.2.0`.
- **FR-002**: System MUST use `AlkemioRoomID` (UUID) for all Room operations, removing dependency on Matrix Room IDs (`!abc...`).
- **FR-003**: System MUST use `AlkemioContextID` (UUID, mapped from Authorization ID) for all Space operations.
- **FR-004**: System MUST map Alkemio "Agent" entities to Adapter "Actor" entities in all payloads.
- **FR-005**: System MUST implement the full lifecycle for Spaces: Create, Update, Delete, Hierarchy (Set Parent), Membership (Batch Add/Remove).
- **FR-006**: System MUST implement the full lifecycle for Rooms: Create, Update, Delete, Membership (Batch Add/Remove).
- **FR-007**: System MUST implement Messaging: Send, Reply, Delete, Add Reaction, Remove Reaction.
- **FR-008**: System MUST implement Admin functions: List Rooms, List Spaces.
- **FR-009**: System MUST remove legacy code that manually handled Matrix ID resolution or "Direct Messaging" state (now handled by Adapter).
- **FR-010**: System MUST trigger `communication.actor.sync` upon user/VC registration and profile updates (name/avatar), passing `agent.id` as the `actor_id`.
- **FR-011**: System MUST implement the Unified Actor Pattern: rename `senderCommunicationsID` to `actorId` in all adapter DTOs and use `contributor.agent.id` as the value.
- **FR-012**: System MUST resolve `agent.id` at the entry point (resolver/controller) and pass `actorId: string` through the service layer, avoiding User/VC distinction in communication code.
- **FR-013**: System MUST use `communication.hierarchy.set_parent` for all hierarchy modifications (moving Rooms or Spaces).
- **FR-014**: System MUST use `InitialMembers` only when members are known at creation time:
  - **DMs (CONVERSATION_DIRECT)**: YES - both sender and receiver known at creation
  - **User-to-VC (CONVERSATION)**: YES - user known at creation
  - **Updates/Community rooms**: NO - members added later via `communication.room.member.batch.add`
- **FR-015**: System MUST add TODO comments for pagination/limits where the current protocol lacks them (e.g., fetching room history).
- **FR-016**: System MUST drop `communicationID` column from User and VirtualContributor entities via TypeORM migration.
- **FR-017**: System MUST drop `externalRoomID` column from Room entity via TypeORM migration.

### Key Entities

- **Actor**: The term used in the Matrix Adapter protocol to refer to an Alkemio **Agent**. The `AlkemioActorID` maps to `contributor.agent.id` (works for both User and VirtualContributor). This enables a **Unified Actor Pattern** where the communication layer does not distinguish between User and VC.
- **Context**: The term used in the Matrix Adapter protocol to refer to an Alkemio **Space**. The `AlkemioContextID` maps to the Space's **Authorization Policy ID** (`space.authorization.id`).
- **Room**: Represents an Alkemio Chat Room. The `AlkemioRoomID` maps directly to `room.id` (UUID). The legacy `externalRoomID` field (which stored the Matrix ID) is deprecated.

### Unified Actor Pattern (Architectural Simplification)

The refactor introduces a unified "Actor" abstraction:

1. **Single ID type**: All services use `actorId: string` which equals `contributor.agent.id`
2. **Resolution at entry point**: GraphQL resolvers/controllers resolve `agent.id` once from User or VC, then pass it downstream
3. **No User/VC distinction**: The communication layer treats all actors uniformly
4. **Deprecated fields**: `User.communicationID` and `VirtualContributor.communicationID` are replaced by `agent.id`
5. **IdentityResolverService obsolete**: The Adapter now returns `AlkemioActorID` (which IS `agent.id`) in responses, eliminating reverse lookups



## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The server builds successfully with `@alkem-io/matrix-adapter-go-lib@0.2.0` and no references to the old library.
- **SC-002**: All existing contract tests for communication pass (or are updated to reflect the new protocol if strictly necessary, though protocol should be opaque).
- **SC-003**: 100% of defined protocol events (Room, Space, Message) are implemented in the Adapter service.
- **SC-004**: LOC reduction is measured and documented post-implementation (target: net reduction due to legacy code removal).

### Implementation Guideline

- **Aim for LOC reduction**: This refactor should result in a net reduction of lines of code by removing legacy Matrix ID handling, `IdentityResolverService` usage, and deprecated fields (`communicationID`, `externalRoomID`).


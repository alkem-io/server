# Feature Specification: Group Conversations & Unified Messaging API

**Feature Branch**: `040-group-conversations`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "Refactor private conversations under messaging to support not only direct but also group conversations. Unify GraphQL mutations/resolvers so conversations return all members (not just 'other member'). Handle subscriptions for group conversations properly."

## Clarifications

### Session 2026-03-04

- Q: Should direct and group conversation creation use separate mutations or a unified one? → A: Unified `createConversation` mutation with an explicit `type` parameter (DIRECT or GROUP) plus member list. Direct conversations and group conversations are fundamentally different in Matrix (DM rooms vs. group rooms — you cannot add members to a DM), so the type must be explicit, not inferred from member count. Group conversations can have 2+ members (creator + at least 1 other).
- Q: What happens when a group conversation drops to exactly 1 remaining member? → A: Allow 1-member groups to exist. The remaining member retains access to conversation history and can add new members to revive the conversation.
- Q: Should the deprecated `user`/`virtualContributor` fields have a backward compatibility period? → A: No backward compatibility needed. Drop them immediately. The unified `members` field returns actors with actor types. Frontend will adapt.
- Q: Do we need separate conversation type enums (DIRECT_USER, DIRECT_VC, GROUP) given that RoomType already distinguishes direct vs group? → A: No. The `CommunicationConversationType` enum is eliminated entirely. The Room's `type` field (`CONVERSATION_DIRECT` vs `CONVERSATION_GROUP`) is the single source of truth for direct vs group distinction. The old USER_USER vs USER_VC distinction is redundant — every code path that branches on it already checks member actor types directly. No new column on the Conversation entity.

## User Scenarios & Testing

### User Story 1 - Unified Conversation Members Resolution (Priority: P1)

All conversations (direct and group) return their full list of members through the API, instead of returning only the "other member" relative to the current user. The frontend determines how to display participants.

**Why this priority**: This is the foundational change that all other stories build on. Without unified member resolution, the API cannot represent group conversations consistently.

**Independent Test**: Query any existing direct conversation and verify it returns all members (both participants) instead of just the "other" one.

**Acceptance Scenarios**:

1. **Given** a direct conversation between User A and User B, **When** User A queries the conversation, **Then** the response includes both User A and User B in the members list.
2. **Given** a direct conversation between User A and a Virtual Contributor, **When** User A queries the conversation, **Then** the response includes both User A and the VC in the members list.
3. **Given** the old `user` and `virtualContributor` fields, **When** the schema is updated, **Then** these fields are removed entirely — the `members` field (returning actors with actor types) replaces them.

---

### User Story 2 - Create Group Conversation (Priority: P1)

A user can create a new group conversation by specifying one or more other members. The system creates the conversation, assigns all members, provisions a group messaging room, and notifies all participants in real time.

**Why this priority**: Core capability — without creation, group conversations cannot exist.

**Independent Test**: Create a group conversation with 3 members, verify all members appear in the conversation, and confirm each member receives a real-time notification.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they create a conversation with type GROUP and 1 or more other members, **Then** a group conversation is created with all members and a group messaging room (`CONVERSATION_GROUP`) is provisioned.
2. **Given** an authenticated user, **When** they create a conversation with type DIRECT and 1 other member, **Then** a direct conversation is created with a DM room (`CONVERSATION_DIRECT`), preserving existing behavior.
3. **Given** an authenticated user, **When** they create a group conversation, **Then** all invited members receive a real-time subscription event.
4. **Given** an authenticated user, **When** they attempt to create a conversation with a non-existent member ID, **Then** the system returns an appropriate error.
5. **Given** an authenticated user, **When** they create a conversation with type GROUP but no other members, **Then** the system rejects the request (minimum 2 members: creator + 1 other).

---

### User Story 3 - Manage Group Membership (Priority: P1)

Members of a group conversation can add new members or remove existing members. Membership changes are broadcast to all current members via subscriptions.

**Why this priority**: Membership management is essential for a usable group conversation feature.

**Independent Test**: Add a new member to an existing group conversation, verify they appear in the members list and receive subscription events for that conversation.

**Acceptance Scenarios**:

1. **Given** a group conversation, **When** a member adds a new user, **Then** the new user appears in the members list and all existing members receive a membership-changed event.
2. **Given** a group conversation, **When** a member removes another member, **Then** the removed user no longer appears in the members list, loses access, and all remaining members receive a membership-changed event.
3. **Given** a group conversation with 3 members, **When** a member is removed leaving only 2, **Then** the conversation continues to function as a 2-member group (it does not auto-convert to direct).
4. **Given** a group conversation, **When** a member tries to remove themselves, **Then** they successfully leave the conversation and all remaining members are notified.
5. **Given** a group conversation with 2+ members, **When** a member leaves and 1 member remains, **Then** the conversation persists — the remaining member retains access to history and can add new members.
6. **Given** a group conversation, **When** the last member leaves, **Then** the conversation is automatically deleted.

---

### User Story 4 - Group Conversation Lifecycle (Priority: P2)

Group conversations can be deleted. Deletion removes the conversation, its room, and all memberships.

**Why this priority**: Important for cleanup and user control, but secondary to creation and membership.

**Independent Test**: Delete a group conversation and verify it no longer appears in any member's conversation list.

**Acceptance Scenarios**:

1. **Given** a group conversation, **When** a member deletes it, **Then** the conversation, room, and all memberships are removed, and all members receive a deletion event.
2. **Given** a deleted group conversation, **When** any former member queries their conversations, **Then** the deleted conversation does not appear.

---

### User Story 5 - Subscription Events for Group Conversations (Priority: P2)

The existing subscription system handles group conversation events: creation, messages, message removal, read receipts, and membership changes. All members of a group conversation receive relevant events.

**Why this priority**: Subscriptions already work for direct conversations; extending them to groups ensures real-time consistency.

**Independent Test**: Send a message in a group conversation with 4 members and verify all 4 receive the message event.

**Acceptance Scenarios**:

1. **Given** a group conversation with N members, **When** a message is sent, **Then** all N members receive the message event via subscription.
2. **Given** a group conversation, **When** a member is added, **Then** all members (including the new one) receive a membership-changed event.
3. **Given** a group conversation, **When** a member is removed, **Then** the removed member receives a removal event and remaining members receive a membership-changed event.

---

### User Story 6 - Unified Conversation Listing (Priority: P2)

The conversation listing returns a flat list of all conversations for the current actor. The existing categorized fields (`users`, `virtualContributors`, `virtualContributor(wellKnown:)`) are removed — the client handles all categorization using member actor types and room types. For well-known VC identification, the client uses the existing `platform.wellKnownVirtualContributors` query.

**Why this priority**: Users need to discover and access their group conversations alongside direct ones.

**Independent Test**: Create a group conversation, then query the flat conversations list and verify both direct and group conversations appear with correct members and room types.

**Acceptance Scenarios**:

1. **Given** a user with direct and group conversations, **When** they query `me.conversations.conversations`, **Then** all conversations are returned in a flat list — each with `members` (actors with types) and `room` (with room type).
2. **Given** a user with a direct VC conversation, **When** they query the flat list, **Then** the conversation includes a member with `type: VIRTUAL_CONTRIBUTOR`, allowing the client to categorize it.
3. **Given** a user with a well-known VC conversation (e.g., CHAT_GUIDANCE), **When** the client cross-references `platform.wellKnownVirtualContributors` mappings with conversation member IDs, **Then** the client can identify the guidance conversation without a dedicated server-side shortcut.

---

### Edge Cases

- What happens when a user creates a group with duplicate member IDs? The system deduplicates silently.
- What happens when a user tries to add someone already in the group? The system ignores the request idempotently (no error, no duplicate).
- What happens when a user tries to create a direct conversation that already exists? Existing behavior is preserved (returns existing conversation).
- What happens when a group conversation has no messages and all members leave? The conversation is deleted automatically (0 members remaining). A group with 1 remaining member is preserved — the member retains access to history and can add others.
- How does the system handle adding a Virtual Contributor to a group conversation? VCs can be members of group conversations alongside users.
- What happens if the same set of users already has a group conversation and someone tries to create another? Group conversations are not deduplicated — multiple groups with overlapping members are allowed (unlike direct conversations which are unique per pair).
- What happens when a member tries to add/remove members from a direct conversation? The system rejects the request — direct conversations have fixed membership.
- What happens when a user creates a DIRECT conversation where the only member is themselves? The deduplication reduces to 1 unique member, which fails the "at least 2 members" validation. The request is rejected.
- What happens when a previously removed member is re-added to a group? A new membership record is created — the member regains access as if newly added. All members receive a `MEMBER_ADDED` event.
- What happens to in-flight messages when a conversation is being deleted? Messages in transit may be lost. Deletion is not transactional with message delivery — clients should treat deletion events as authoritative.
- What happens when multiple members leave a group conversation simultaneously? Each leave is processed independently. The auto-delete (0 members) is triggered by whichever removal sees 0 remaining members after its own deletion. Database-level atomicity prevents double-delete.

## Requirements

### Functional Requirements

- **FR-001**: System MUST distinguish direct and group conversations via the Room's type field: `CONVERSATION_DIRECT` for direct, `CONVERSATION_GROUP` for group. The `CommunicationConversationType` enum is removed — it is redundant since all behavioral branching is based on member actor types and room type.
- **FR-002**: System MUST provide a unified `createConversation` mutation with an explicit type parameter (DIRECT or GROUP) and a member list. For GROUP type, minimum 2 members (creator + at least 1 other); for DIRECT type, exactly 1 other member (existing behavior). System MUST prevent creating a group conversation with fewer than 2 members.
- **FR-003**: System MUST provide mutations to add and remove members from group conversations. These mutations MUST reject requests targeting direct conversations.
- **FR-004**: System MUST expose all conversation members through a unified `members` field on the Conversation type, returning actors with their actor types.
- **FR-005**: System MUST remove the existing `user` and `virtualContributor` fields from the Conversation type (breaking change — no deprecation period). The `members` field is the sole replacement.
- **FR-006**: System MUST broadcast subscription events for group conversation creation, membership changes, messages, and deletion to all relevant members.
- **FR-007**: System MUST add new subscription event types for membership changes (`MEMBER_ADDED`, `MEMBER_REMOVED`) and deletion (`CONVERSATION_DELETED`).
- **FR-008**: System MUST replace the categorized conversation listing (`users`, `virtualContributors`, `virtualContributor(wellKnown:)`) with a single flat `conversations` field returning all conversations for the current actor. The client handles categorization using member actor types and room types. Well-known VC identification uses the existing `platform.wellKnownVirtualContributors` query.
- **FR-009**: System MUST allow 1-member group conversations to exist (remaining member retains access to history and can add new members). System MUST only auto-delete a group conversation when the last member leaves (0 members remaining).
- **FR-010**: System MUST treat direct and group conversations as distinct constructs — a 2-member group conversation is valid and MUST NOT be conflated with a direct conversation. The explicit type parameter (DIRECT/GROUP) on creation determines the room type permanently.
- **FR-011**: System MUST allow a member to leave a group conversation (self-removal).
- **FR-012**: System MUST deduplicate member IDs when creating a group conversation.
- **FR-013**: Mutation error semantics: `assignConversationMember` on a DIRECT conversation MUST return a validation error. `removeMember` for a non-member MUST return a validation error. `createConversation` with GROUP type and 0 other members MUST return a validation error. `assignConversationMember` for an existing member MUST be idempotent (no error, no duplicate).
- **FR-014**: `assignConversationMember`, `removeConversationMember`, `leaveConversation`, and `updateConversation` mutations MUST return `Boolean!` — `true` when the RPC was sent successfully. These mutations are fire-and-forget: they send an RPC to Matrix and return immediately. Actual state changes arrive asynchronously via subscription events (`MEMBER_ADDED`, `MEMBER_REMOVED`, `CONVERSATION_UPDATED`).
- **FR-015**: `deleteConversation` mutation MUST return a pre-deletion snapshot of the conversation entity (the object is no longer persisted after the mutation completes). This is the only membership/update mutation that returns the entity synchronously.
- **FR-016**: Deleting a conversation (explicitly or via auto-delete) MUST cascade: remove the Room entity (including Matrix Synapse room cleanup via the adapter), remove the authorization policy, and remove the conversation entity. Memberships are cascade-deleted by the ORM.
- **FR-017**: The existing `resetConversationVc` mutation is unchanged in signature but now determines conversation type by checking member actor types (presence of a `VIRTUAL_CONTRIBUTOR` member) rather than using the removed `CommunicationConversationType` enum.
- **FR-018**: Authorization privileges for mutations: `CREATE` on the platform Messaging for `createConversation`, `CONTRIBUTE` on the conversation for `assignConversationMember`, `removeConversationMember`, and `updateConversation`, `READ` on the conversation for `leaveConversation`, `DELETE` on the conversation for `deleteConversation`.
- **FR-019**: Membership and room property changes follow an event-driven architecture: mutations send RPCs to Matrix only, and inbound Matrix events (via RabbitMQ) trigger DB persistence, authorization policy re-application, and subscription event publishing. For `CONVERSATION_DELETED`, the event contains only the conversation UUID (the entity no longer exists). For `MEMBER_REMOVED`, events are delivered to all members as of before the removal (including the removed member). Subscription filtering uses the actor's ID to match against the conversation's member list.
- **FR-020**: Event delivery follows the platform's existing at-most-once subscription model (GraphQL subscriptions over WebSocket). No additional delivery guarantees are introduced. Event ordering within a single conversation is not guaranteed across concurrent mutations.
- **FR-021**: System MUST provide an `updateConversation` mutation to update display name and avatar URL for GROUP conversations. Only GROUP conversations support these properties — DIRECT conversations MUST reject update requests. Changes are persisted via inbound `room.updated` Matrix events and broadcast to members via `CONVERSATION_UPDATED` subscription events.
- **FR-022**: System MUST store `avatarUrl` on the Room entity (nullable column). The avatar URL is synced from Matrix via `room.updated` events, ensuring consistency even when changes originate from Synapse directly.
- **FR-023**: System MUST provide a `CONVERSATION_UPDATED` subscription event type, published when a conversation's room properties (display name, avatar URL) change. The event includes the full conversation entity.

### Key Entities

- **Conversation**: No schema changes. Direct vs group is determined by the associated Room's type. No `type` column on Conversation — the Room is the single source of truth.
- **ConversationMembership**: Unchanged pivot table linking Conversation to Agent. Already supports N members.
- **Messaging**: Platform singleton container for all conversations. Unchanged structurally.
- **Room**: Extended with `CONVERSATION_GROUP` room type value. Group conversations get a `CONVERSATION_GROUP` room; direct conversations keep `CONVERSATION_DIRECT`. The room type drives Matrix adapter behavior (DM room vs group room) and query filtering.

### Non-Functional Requirements

- **NFR-001**: Group conversation operations (create, add/remove member, list) MUST perform within the same latency bounds as direct conversations for groups up to 50 members. Performance above 50 members is best-effort — no specific latency target.
- **NFR-002**: Each membership change (add/remove) triggers authorization policy re-application for the conversation. This cost scales linearly with member count. For groups up to 50 members, this is acceptable. No caching or batching optimization is required for this iteration.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create, manage, and delete group conversations through the API with the same reliability as direct conversations.
- **SC-002**: All members of a group conversation receive real-time subscription events within the same latency bounds as direct conversations.
- **SC-003**: The unified `members` field correctly returns all participants for both direct and group conversations.
- **SC-004**: Existing direct conversation functionality continues to work without regression — the `members` field returns correct actors for both direct and group conversations.
- **SC-005**: Conversation listing returns all conversations in a flat list with correct members and room types, enabling client-side categorization.

## Assumptions

- The existing `ConversationMembership` pivot table supports N members without schema changes to the membership entity itself.
- Matrix Synapse rooms already support multiple participants, so no adapter-level changes are needed for multi-member rooms beyond using the correct room type.
- Authorization for group conversations follows the same pattern as direct conversations (membership-based access via the Messaging entity's authorization inheritance).
- There is no maximum member count for group conversations. If a limit is desired, it can be added later.
- Group conversations do not have a concept of "admin" or "owner" — all members have equal privileges (add/remove members, delete conversation).
- Group conversations support display name and avatar URL properties. These are stored on the Room entity and synced with Matrix bidirectionally via events.
- The `CommunicationConversationType` enum and all code referencing it (including `inferConversationType`) will be removed as part of this feature. The USER_USER vs USER_VC distinction was always derivable from member actor types.

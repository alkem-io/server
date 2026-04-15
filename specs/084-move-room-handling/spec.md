# Feature Specification: Room Handling During Cross-Space Moves

**Feature Branch**: `084-move-room-handling`
**Created**: 2026-03-30
**Status**: Draft
**Scope**: Backend (server) — communication layer integration
**Input**: Clarification of Matrix/Synapse room handling for cross-space move operations
**Related**: `083-cross-space-moves` (parent feature), `080-move-spaces` (broader vision)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Preserve Discussion Comments After Move (Priority: P1)

As a user who has participated in discussions within a subspace, I want my comments and everyone else's comments to remain readable after the subspace is moved to a different space so that the collaborative history and knowledge are not lost.

When a subspace (L1) is moved across L0 boundaries, every callout's discussion room retains its full comment history. Comments remain attributed to the original author. Users who navigate to the moved subspace can read the entire discussion thread exactly as it existed before the move — same messages, same authors, same order.

**Why this priority**: Comments represent the accumulated knowledge and decision history of a collaborative effort. Losing them during a reorganization operation would undermine trust in the platform. This is the primary user-facing concern for communication during moves.

**Independent Test**: Create an L1 subspace with a callout that has 10+ comments from different users. Move the L1 to a different L0 space. Navigate to the callout in its new location and verify all 10+ comments are visible, correctly attributed to their original authors, and in the original order.

**Acceptance Scenarios**:

1. **Given** a callout in an L1 subspace has 15 comments from 5 different users, **When** the subspace is moved to a different L0, **Then** all 15 comments are visible in the callout's discussion at the new location, each attributed to the correct original author.
2. **Given** a callout has threaded replies and reactions on comments, **When** the subspace is moved, **Then** thread structure and reactions are preserved.
3. **Given** an L1 subspace has multiple callouts each with their own discussion rooms, **When** the subspace is moved, **Then** every callout's comments are preserved independently.
4. **Given** the L1 subspace has L2 sub-subspaces with their own callouts and comments, **When** the entire subtree is moved, **Then** comments in L2 callouts are also fully preserved.
5. **Given** a subspace has been moved and a new user joins the moved space's community, **When** they navigate to a callout discussion, **Then** they can read all comments written before the move (with correct author attribution) and post new comments.
6. **Given** a subspace has been moved and a new user joins, **When** they post a new comment to a preserved discussion room, **Then** the comment appears alongside the pre-move comments in the same thread — the discussion continues seamlessly.

---

### User Story 2 — Revoke Room Memberships After Move (Priority: P1)

As a platform administrator, I want communication room memberships to be revoked when a subspace is moved so that former community members no longer have access to post or receive updates in rooms that belong to the moved space.

When a cross-L0 move clears community memberships (as specified in `083-cross-space-moves`), the corresponding communication room memberships must also be revoked. This ensures that users who are no longer part of the community cannot continue to post messages or receive notifications from rooms in the moved space.

**Why this priority**: This is co-P1 with comment preservation because it is a security and access control requirement. Without membership revocation, former community members could continue interacting with rooms they should no longer access.

**Independent Test**: Create an L1 subspace with community members who have posted comments. Move the L1 to a different L0. Verify that the former members can no longer post new messages to the callout discussion rooms or the community updates room, and no longer receive notifications from those rooms.

**Acceptance Scenarios**:

1. **Given** 10 users are members of a callout discussion room in the L1 subspace, **When** the subspace is moved to a different L0, **Then** all 10 users are removed from the room's membership. They can no longer post new messages.
2. **Given** a user was a member of the community updates room, **When** the subspace is moved, **Then** the user no longer receives updates from that room.
3. **Given** a user who was removed from the room navigates to the moved callout, **When** they attempt to post a comment, **Then** they receive an authorization error.
4. **Given** a user is a member of rooms in both the moved L1 and one of its L2 sub-subspaces, **When** the subtree is moved, **Then** the user is removed from rooms at both levels.

---

### User Story 3 — Recreate Community Updates Room (Priority: P2)

As a platform administrator, I want the community updates room to be recreated fresh after a cross-L0 move so that the new community context starts with a clean announcement channel.

The community "updates" room — used for announcements and broadcasts — is recreated empty after the move. Unlike callout discussion rooms (which hold collaborative knowledge), the updates room is an administrative broadcast channel. Its history is specific to the old community context and is not meaningful in the new one.

**Why this priority**: This is lower priority because the updates room is an admin broadcast channel, not a knowledge repository. Recreating it is a clean-slate approach that avoids confusion from old announcements appearing in a new community context.

**Independent Test**: Create an L1 subspace, post several community updates. Move the subspace to a different L0. Verify the updates room is empty (no old announcements) and new updates can be posted by the new parent's admins.

**Acceptance Scenarios**:

1. **Given** the L1 subspace's community updates room has 5 announcements, **When** the subspace is moved to a different L0, **Then** the updates room is recreated empty — the old announcements are not visible.
2. **Given** the updates room has been recreated, **When** an admin of the target L0 posts an update, **Then** it appears in the new updates room successfully.
3. **Given** the L1 has L2 sub-subspaces with their own community updates rooms, **When** the subtree is moved, **Then** each sub-subspace's updates room is also recreated empty.

---

### Edge Cases

- **Room with no messages**: A callout discussion room that was never used (zero messages). The room should be preserved as-is — no special handling needed.
- **Post contribution comment rooms**: Posts within callouts also have their own comment rooms. These must follow the same preservation rules as callout discussion rooms — comments preserved, memberships revoked.
- **Membership revocation failure**: If the external messaging service is unavailable during the move, revocation failures are logged and swallowed (fire-and-forget). The move itself (database transaction) is not blocked by a messaging service outage.
- **User who is member of both source and target communities**: A user who belongs to both the old and new L0 communities. After the move, their membership in the moved space's rooms is revoked (along with everyone else's). They would need to be re-added through the new community context if applicable.
- **Large room membership lists**: A subspace with hundreds of room members. The membership revocation must handle batch operations efficiently without timing out.
- **Comment author attribution after move**: Comment authorship is inherent in the messaging system — the original author's identity is stored with each message. No re-attribution or migration is needed.
- **Concurrent message posting during move**: If a user posts a message to a room while the move is in progress, the message may succeed (if membership hasn't been revoked yet) or fail (if it has). This is acceptable — the move operation takes precedence.

## Requirements *(mandatory)*

### Functional Requirements

#### Comment and Discussion Preservation

- **FR-001**: When a space is moved across L0 boundaries, system MUST preserve all callout discussion rooms and their complete message history (comments, threads, reactions).
- **FR-002**: Comment authorship (the association between each message and the user who wrote it) MUST remain intact after the move. No re-attribution or migration of message content is required.
- **FR-003**: Post contribution comment rooms MUST follow the same preservation rules — comments preserved, memberships revoked.
- **FR-004**: The local room metadata records (room entity linked to each callout and post) MUST remain intact. No room entity re-creation is needed for discussion rooms.
- **FR-005**: The message count tracked locally for each preserved room MUST remain accurate after the move.

#### Membership Revocation

- **FR-006**: When community memberships are cleared during a cross-L0 move, system MUST revoke all user memberships from every communication room in the moved space and its subtree. This includes callout discussion rooms, post comment rooms, and the community updates room.
- **FR-007**: Membership revocation MUST be performed as a batch operation across all rooms in the moved subtree.
- **FR-008**: Membership revocation from the messaging service is a non-transactional side effect. It MUST NOT block or roll back the database move transaction. If the messaging service is unavailable, revocation failures are logged and swallowed (fire-and-forget pattern). No application-level retry is performed; transport-level reliability (AMQP message durability) provides best-effort delivery.
- **FR-009**: After membership revocation, former members MUST NOT be able to post new messages to any room in the moved space.

#### Post-Move Room Re-population

- **FR-010**: When new users join the moved space's community after the move, system MUST add them to the preserved callout discussion rooms and post comment rooms in the moved subtree.
- **FR-011**: Newly added room members MUST be able to read the complete existing message history — all comments written before the move remain visible to them.
- **FR-012**: Newly added room members MUST be able to write new comments to preserved rooms, continuing the discussion seamlessly.
- **FR-013**: Room re-population for new community members MUST follow the same mechanism used when users join any space's community — no special handling beyond the standard membership flow.

#### Community Updates Room Recreation

- **FR-014**: The community updates room for the moved space MUST be recreated empty after the move. Old announcements are discarded.
- **FR-015**: Updates rooms in L2 sub-subspaces within the moved subtree MUST also be recreated empty.
- **FR-016**: The recreated updates room MUST be functional — new community members (once added) must be able to receive and post updates.

### Non-Functional Requirements

- **NFR-001**: All communication adapter calls during the move MUST be fire-and-forget — non-blocking, no await, failures logged and swallowed. The move operation's transaction time is not affected.
- **NFR-002**: Batch membership revocation uses one adapter call per actor (all rooms batched). Call count is O(actors), not O(actors × rooms). This must stay within the 10s AMQP RPC timeout for spaces with hundreds of members.
- **NFR-003**: No application-level retry for failed adapter calls. Transport-level reliability (AMQP message durability, adapter reconnection) provides best-effort delivery. Accepted risk: if the AMQP publish itself fails, the operation is lost.

### Key Entities

- **Room**: Communication channel that holds messages. Linked to a callout (discussion comments), a post (contribution comments), or a community (updates/announcements). The room identifier maps to an external messaging room where actual message content is stored.
- **Callout**: Content container within a collaboration. Has a one-to-one relationship with a discussion room. Multiple callouts exist in each space, each with its own independent room.
- **Post**: Contribution within a callout. May have its own comment room, separate from the parent callout's discussion room.
- **Communication**: Community-scoped entity that owns the "updates" room for announcements. One per space community. Recreated during moves.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a cross-L0 move, 100% of comments in callout discussions and post comment rooms are readable at the new location, with correct author attribution.
- **SC-002**: After a cross-L0 move, 0% of former community members retain the ability to post new messages to any room in the moved space.
- **SC-003**: The community updates room is empty after the move — 0 old announcements visible.
- **SC-004**: Membership revocation does not increase the move operation's transaction time — it is performed asynchronously without blocking the core database operation.
- **SC-005**: If the messaging service is temporarily unavailable during a move, revocation failures are logged with structured details (actor count, room count, error). No application-level retry; transport-level message durability provides best-effort delivery.
- **SC-006**: Thread structure, reactions, and message ordering within preserved rooms are identical before and after the move.
- **SC-007**: New community members who join the moved space after the move can read 100% of pre-existing comments and post new comments without any special action beyond standard community membership.

## Clarifications

### Session 2026-03-30

- Q: After revoking memberships but preserving comments, can the new community (post-move) join preserved rooms and read existing + write new comments? → A: Yes. New community members must be added to preserved rooms via the standard membership flow, must see all pre-move comments, and must be able to post new comments seamlessly. The discussion continues uninterrupted.

## Assumptions

- **Message content is external**: All actual message content (comments, reactions, threads) is stored in the external messaging service, not in the local database. The local database stores only room metadata (ID, type, message count). "Preserving comments" means preserving the external room — no data migration needed.
- **Authorship is inherent**: Each message in the messaging service carries the author's identity. There is no separate attribution table or local record that needs updating.
- **Membership revocation is best-effort**: The external messaging service may be temporarily unavailable. Revocation failures are logged and swallowed (fire-and-forget pattern); no application-level retry is performed. This is consistent with the move's atomicity model where non-transactional side effects are best-effort (as specified in `083-cross-space-moves` FR-010).
- **Updates room is disposable**: Community updates are administrative broadcasts, not collaborative knowledge. Recreating the updates room fresh is acceptable because announcements from the old community context are not relevant in the new one.
- **Callout and post rooms are not disposable**: Discussion comments represent collaborative knowledge — design decisions, brainstorming, feedback. These must survive the move intact.
- **Room membership follows community membership**: When community roles are cleared, room memberships must be cleared in sync. There is no scenario where a user retains room access after losing community membership.
- **This spec is a companion to 083-cross-space-moves**: It addresses the communication layer concern deferred during 083's clarification phase. Implementation should be coordinated with 083's move service logic.

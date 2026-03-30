# Feature Specification: Cross-Space Moves

**Feature Branch**: `083-cross-space-moves`
**Created**: 2026-03-30
**Status**: Draft
**Scope**: Cross-service — backend (server) and frontend (client-web)
**Input**: GitHub Issue [#5898](https://github.com/alkem-io/server/issues/5898) — Move Spaces — Cross-Space Transfers
**Related**: [client-web #9445](https://github.com/alkem-io/client-web/issues/9445), client-web `025-admin-transfer-ui` spec, server `080-move-spaces` spec (broader move vision)
**Dependency (implemented)**: `084-move-room-handling` — Room handling during cross-space moves (comment preservation, membership revocation, updates room recreation) is fully implemented via `SpaceMoveRoomsService`. The move service calls `handleRoomsDuringMove(movedSpaceId, removedActorIds)` after the database transaction commits.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Move Subspace to a Different Space (Priority: P1)

As two initiatives partnering up, I want to move a subspace from our old space to a new shared space so that we can consolidate collaborative work without recreating content.

A platform administrator selects a subspace (L1) and moves it to a different top-level space (L0). The subspace retains its level (remains L1) but changes parent from the source L0 to the target L0. All content — callouts, posts, whiteboards, sub-subspaces — moves with it. Community memberships are cleared because the community context changes.

**Why this priority**: This is the most commonly requested reorganization operation. Partners, merging teams, and evolving organizations currently cannot restructure their spaces without recreating content from scratch. No existing mutation supports this.

**Independent Test**: Create two L0 spaces. Add an L1 subspace with callouts and an L2 sub-subspace to the first. Move the L1 to the second L0. Verify all content appears under the new L0, community is cleared, authorization reflects the new parent, and the old L0 no longer contains the moved subspace.

**Acceptance Scenarios**:

1. **Given** an L1 subspace with callouts and posts exists under Space A (L0), **When** a platform admin moves it to Space B (L0), **Then** the subspace and all its content appear under Space B, and it is no longer under Space A.
2. **Given** the L1 subspace has two L2 sub-subspaces, **When** it is moved to a different L0, **Then** both sub-subspaces and their content move with the parent, and their level-zero space reference is updated to the target L0.
3. **Given** the L1 subspace has community members (admins, leads, regular members), **When** it is moved, **Then** all community memberships are cleared in the moved subspace and its descendants.
4. **Given** a user without platform admin privileges, **When** they attempt the move, **Then** the operation is rejected with an authorization error.
5. **Given** the L1 subspace's nameID (or any descendant's nameID) collides with an existing entity in the target L0 scope, **When** the move is attempted, **Then** the operation is rejected with a clear collision error.

---

### User Story 2 — Move Subspace to Be a Sub-subspace in Another Space (Priority: P2)

As a space facilitator, I want to nest a subspace under another subspace in a different top-level space so that I can group related work across organizational boundaries.

A platform administrator selects an L1 subspace and converts it to an L2 sub-subspace under a target L1 in a different L0 space. This is conceptually the same as the existing L1→L2 demotion but without the same-L0 constraint — it works across L0 boundaries.

**Why this priority**: This completes the cross-L0 reorganization toolkit alongside US1. Without it, the only way to nest a subspace from Space A under a subspace in Space B is to manually recreate the content. The existing L1→L2 mutation explicitly blocks this with a same-L0 validation.

**Independent Test**: Create two L0 spaces, each with an L1 subspace. Move the L1 from the first L0 to become an L2 under the L1 in the second L0. Verify the space is now L2, its content is preserved, community is cleared, and the level-zero space reference reflects the new L0.

**Acceptance Scenarios**:

1. **Given** L1 Subspace A in Space X and L1 Subspace B in Space Y (different L0), **When** a platform admin moves Subspace A to be an L2 under Subspace B, **Then** Subspace A becomes an L2 sub-subspace of Subspace B in Space Y.
2. **Given** Subspace A has L2 children, **When** the admin attempts to move it to be an L2 under another L1, **Then** the operation is rejected because the children would exceed the maximum nesting depth.
3. **Given** Subspace A has community members and leads, **When** it is moved cross-L0 to become an L2, **Then** all community roles are cleared except user admins (consistent with existing L1→L2 behavior).
4. **Given** Subspace A's nameID collides with an existing entity in the target L0 scope, **When** the move is attempted, **Then** it is rejected with a collision error.

---

### User Story 3 — Admin UI for Cross-Space Move Operations (Priority: P1)

As a platform administrator, I want a UI to trigger cross-space move operations from the existing Conversions & Transfers admin page so that I can reorganize spaces without making direct API calls.

The new operations are added to the existing **Space Conversions** section on the Conversions & Transfers page (built in client-web `025-admin-transfer-ui`). When an L1 space is resolved, the existing "Promote | Demote" toggle is extended with a third option: **"Move"**. The Move option shows a target picker where the admin selects the destination — either an L0 space (for L1→L1 cross-L0 move) or an L1 space in a different L0 (for L1→L2 cross-L0 demotion).

**Why this priority**: This is co-P1 with US1 because the backend operations have no value without a UI. The acceptance criteria in issue #5898 explicitly require "UI provided for platform admins to trigger the above cross-space move operations." The operations integrate into the page already being built in `025-admin-transfer-ui`.

**Independent Test**: Navigate to the admin Conversions & Transfers page, enter an L1 space URL, select "Move" from the toggle, pick a target L0 or L1 space, confirm through the warning dialog, and verify the space appears in its new location.

**Acceptance Scenarios**:

1. **Given** the admin resolves an L1 space URL on the Conversions & Transfers page, **When** the operations are displayed, **Then** a three-option toggle appears: "Promote | Demote | Move" (defaulting to "Promote" as before).
2. **Given** the admin selects "Move" for an L1 space, **When** the move form appears, **Then** a move-type selector offers "Move to another Space (stays L1)" and "Move under a Subspace in another Space (becomes L2)", and a searchable target picker is shown based on the selected move type.
3. **Given** the admin selects "Move to another Space" and picks a target L0 from the picker, **When** they confirm, **Then** a confirmation dialog warns that community memberships will be cleared and content will be moved. After confirmation the mutation executes and a success message is shown.
4. **Given** the admin selects "Move under a Subspace" and picks a target L1 in a different L0, **When** they confirm, **Then** the confirmation dialog warns that the space will be demoted to L2, community roles will be cleared (except user admins), and content will be moved.
5. **Given** the L1 space has L2 children and the admin selects "Move under a Subspace", **When** the picker appears, **Then** the option is disabled with an explanation that nesting depth would be exceeded.
6. **Given** the resolved space is L0 or L2, **When** the toggle appears, **Then** the "Move" option is not shown (move operations apply only to L1 spaces).

---

### Edge Cases

- **Circular hierarchy prevention**: Moving L1-A under L1-B which is itself under L0-X, when L1-A has an L2 that references L0-X — the system must update all level-zero space references correctly and prevent any structural inconsistency.
- **Self-move / no-op**: Moving an L1 to its current parent L0 is a no-op. The system rejects with a clear message.
- **Depth overflow on cross-L0 L1→L2**: If the source L1 has L2 children, the operation is blocked because children would become L3 (exceeding max depth).
- **NameID collision across L0 boundaries**: The moved space or descendants may have nameIDs that collide with existing entities scoped to the target L0. The system validates before executing.
- **Content in active use**: The move proceeds within its database transaction. Concurrent edits receive a conflict error.
- **Authorization chain reset**: The moved space and its entire subtree must inherit the new parent's authorization chain.
- **Innovation flow mismatch**: When crossing L0 boundaries, the target L0 may have a different innovation flow template. Callout classification tagsets in the moved subtree are synchronized using the existing conversion service's sync pattern — unmatched states fall back to the target's default.
- **Storage references**: All file and media references remain valid. The storage aggregator parent is updated to the new context.
- **Visibility and privacy preservation**: The space's visibility state (ACTIVE, ARCHIVED, DEMO, INACTIVE) and privacy mode (PUBLIC, PRIVATE) are preserved on move. All visibility states are eligible for cross-L0 moves — no reactivation required.
- **Empty source parent**: After the move, the source L0 may have zero L1 children — this is valid.
- **Network failure during admin UI operation**: Backend mutations are atomic — no partial state. The admin sees an error and can safely retry.

## Requirements *(mandatory)*

### Functional Requirements

#### Backend — New Mutation: Move L1 to Different L0

- **FR-001**: System MUST provide a new dedicated mutation (`moveSpaceL1ToSpaceL0`) to move an L1 space to a different L0 space, preserving the space at level 1 and re-parenting it under the target L0.
- **FR-002**: The move MUST transfer the entire subtree — all L2 sub-subspaces and their content move with the L1 space.
- **FR-003**: The move MUST update the level-zero space reference for the moved space and its entire subtree to the target L0.
- **FR-004**: The move MUST clear ALL community memberships (members, leads, admins, organizations, virtual contributors) in the moved space and its descendants. No roles are preserved — the target L0's admins manage the moved space via authorization chain inheritance.
- **FR-005**: The move MUST update the authorization chain of the moved space and its subtree to inherit from the target L0's authorization policies.
- **FR-006**: The move MUST update storage aggregator parent references for the moved space and its nested entities.
- **FR-007**: The move MUST invalidate all cached URLs for the moved space, its subtree, and all contained entities (profiles, collaborations, callouts, contributions).
- **FR-008**: The move MUST validate that no space nameID in the moved subtree collides with existing space nameIDs scoped to the target L0 (L0 itself + all L1/L2 children). Callout, post, and profile nameIDs are not in scope. If a collision is detected, the move is rejected with a clear error identifying the conflicting nameID.
- **FR-009**: The move MUST reject self-moves (moving an L1 to its current parent L0) with a clear message.
- **FR-010**: The move MUST be atomic — single database transaction. If any step fails, the entire operation rolls back. Non-transactional side effects (cache invalidation) use best-effort after commit.
- **FR-011**: The move MUST require platform admin privileges.

#### Backend — Cross-L0 Demotion: L1→L2 Across L0 Boundaries

- **FR-012**: System MUST provide a new dedicated mutation (`moveSpaceL1ToSpaceL2`) to move an L1 space to L2 under a target L1 in a different L0 space. The existing `convertSpaceL1ToSpaceL2` mutation remains unchanged (same-L0 constraint preserved).
- **FR-013**: Cross-L0 demotion MUST reject moves where the source L1 has L2 children, because the children would exceed the maximum nesting depth.
- **FR-014**: Cross-L0 demotion MUST update the level-zero space reference for the moved space to the target L0's ID.
- **FR-015**: Cross-L0 demotion MUST clear all community roles except user admins (consistent with existing within-L0 demotion behavior).
- **FR-016**: Cross-L0 demotion MUST validate nameID uniqueness within the target L0 scope.
- **FR-017**: Cross-L0 demotion MUST require platform admin privileges.

#### Backend — Shared Concerns

- **FR-018**: When a move crosses L0 boundaries, system MUST synchronize callout classification tagsets in the moved subtree with the target L0's innovation flow template configuration, using the same sync pattern as the existing within-L0 conversion service. Unmatched flow states fall back to the target's default state.
- **FR-019**: System MUST recalculate platform role access (anonymous, guest, registered user visibility) for the moved space and its subtree based on the new parent's access configuration.
- **FR-020**: System MUST update sort order and display position of the moved space within its new parent context.
- **FR-021**: System MUST preserve the space's visibility state and privacy mode on move.
- **FR-021b**: The move MUST update the Account association of the moved space and its subtree to the target L0's Account. Storage and license quotas are recalculated against the target Account.

#### Frontend — Admin UI Integration

- **FR-022**: The existing Space Conversions section on the Conversions & Transfers admin page MUST be extended to include a "Move" option in the toggle button group when an L1 space is resolved, making the toggle "Promote | Demote | Move".
- **FR-023**: When "Move" is selected, the UI MUST present a move-type selector with two options: "Move to another Space (stays L1)" and "Move under a Subspace in another Space (becomes L2)".
- **FR-024**: For "Move to another Space", the UI MUST provide a searchable picker showing L0 spaces (excluding the current parent L0). The picker filters by spaces where the admin has access.
- **FR-025**: For "Move under a Subspace", the UI MUST provide a searchable picker showing L1 spaces in other L0 spaces (excluding sibling L1 spaces in the same L0 — those are handled by the existing "Demote" operation).
- **FR-026**: "Move under a Subspace" MUST be disabled with an explanation when the source L1 has L2 children (depth overflow).
- **FR-027**: The confirmation dialog for "Move to another Space" MUST warn that community memberships will be cleared, content will move to the new space, and innovation flow may differ.
- **FR-028**: The confirmation dialog for "Move under a Subspace" MUST warn that the space will be demoted to L2, community roles will be cleared except user admins, and the space will be nested under the selected subspace.
- **FR-029**: The "Move" option MUST only be shown for L1 spaces. L0 and L2 spaces do not show a "Move" toggle option.
- **FR-030**: System MUST display a loading indicator during mutation execution and prevent duplicate submissions.
- **FR-031**: System MUST display clear success messages after successful move operations.
- **FR-032**: System MUST display clear error messages when moves fail (nameID collision, authorization failure, depth overflow).

### Key Entities

- **Space**: Organizational unit at level 0 (space), 1 (subspace), or 2 (sub-subspace). Has a level-zero space reference that tracks which L0 it belongs to. The cross-space move changes this reference for the entire subtree.
- **Community**: Membership container for a space. Contains role assignments (members, admins, leads, facilitators). For L1→L1 cross-L0 moves, all roles are cleared. For L1→L2 cross-L0 demotion, all roles except user admins are cleared (consistent with existing L1→L2 behavior).
- **Collaboration**: Content container for a space. Holds callouts, posts, whiteboards, discussions, innovation flows — all move intact with the space. Classification tagsets must be resynchronized when crossing L0 boundaries.
- **Authorization**: Hierarchical policy chain. When a space moves to a new parent, the moved subtree must inherit the new parent's authorization chain.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Platform admins can move an L1 subspace from one L0 space to another in a single operation, with all content intact and no data loss.
- **SC-002**: Platform admins can move an L1 subspace to become an L2 under an L1 in a different L0 space, with content preserved and community roles cleared.
- **SC-003**: After any cross-space move, 100% of content (callouts, posts, whiteboards, sub-subspaces) is accessible in the new location.
- **SC-004**: After any cross-space move, 0% of community memberships from the source context persist — all non-admin roles are cleared.
- **SC-005**: NameID collision attempts and depth-overflow attempts are rejected 100% of the time with user-understandable error messages.
- **SC-006**: The move operation completes atomically — either fully succeeds or fully rolls back, with no partial state observable.
- **SC-007**: Platform admins can initiate and complete a cross-space move from the admin UI in under 60 seconds of wall-clock time.
- **SC-008**: The existing promote, demote, and within-L0 operations continue to work identically after the new "Move" option is added.
- **SC-009**: The "Move" option only appears for L1 spaces — L0 and L2 spaces cannot trigger cross-space moves from the UI.

## Clarifications

### Session 2026-03-30

- Q: When an L1 moves to a different L0 (stays L1), should user admins be preserved or should ALL community roles be cleared? → A: Clear ALL roles including admins. The target L0's admins inherit management via authorization chain. This differs from L1→L2 demotion (which preserves user admins) because a lateral move into a completely different space context warrants a clean slate.
- Q: How should the two cross-L0 operations be exposed in the GraphQL API — new mutations, extend existing, or single generic? → A: Two new dedicated mutations (`moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`). The existing `convertSpaceL1ToSpaceL2` remains unchanged. This eliminates regression risk to existing operations and gives each move operation a clear semantic name aligned with the frontend's "Move" toggle.
- Q: When source and target L0s have different innovation flow states, how should callout classification tagsets be synchronized? → A: Reuse the existing sync pattern from the within-L0 conversion service. Callouts are remapped to the target flow's state set; unmatched states fall back to the target's default state. No new synchronization logic is needed — the cross-L0 move delegates to the same classification sync path.
- Q: When source and target L0s have different Accounts (billing/licensing), what happens to the moved space's Account association? → A: Inherit the target L0's Account. The moved space and its subtree switch to the target's Account, with storage and license quotas recalculated against the target. Consistent with the principle that the moved space fully belongs to the new parent context.
- Q: Can non-ACTIVE spaces (ARCHIVED, DEMO, INACTIVE) be moved cross-L0? → A: Allow all states. Any L1 space can be moved regardless of visibility state. The state is preserved as-is at the new location. No reactivation step required — platform admin privileges are sufficient safeguard.
- Q: What is the exact scope of nameID collision validation (FR-008)? → A: Space nameIDs only — the L0 and all its L1/L2 children. Callouts, posts, and profiles don't have nameIDs that participate in URL routing collisions.

## Assumptions

- **Platform admin only**: Cross-space moves require platform admin privileges. No space-level admin can trigger cross-L0 moves — this is a deliberate safety constraint given the impact (community clearing, authorization chain reset).
- **Content moves, users don't**: All community role assignments are cleared. The community entity is preserved but emptied. The moved space inherits authorization from the new parent — the new parent's admins manage the moved space.
- **Existing mutations unchanged**: The current `convertSpaceL1ToSpaceL2` (same-L0 constraint) and all other existing conversion mutations remain untouched. Cross-L0 operations use two new dedicated mutations (`moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`), avoiding any regression risk to existing behavior.
- **Subtree moves intact**: The entire subtree (L2 children and their content) moves with the L1. Individual child extraction is not in scope.
- **No cascading notifications**: The initial implementation does not notify former community members about the move. This may be added later.
- **Storage references remain valid**: Files and media remain accessible via existing references after the storage aggregator parent is updated.
- **Frontend integrates into existing page**: The UI for cross-space moves is added to the existing Conversions & Transfers page (`025-admin-transfer-ui`) — not a new page. It extends the L1 space toggle from "Promote | Demote" to "Promote | Demote | Move".
- **Innovation flow synchronization uses existing patterns**: Callout classification tagset synchronization follows the same approach already used by the conversion service for within-L0 operations.
- **NameID collision is checked before the move**: The system validates all nameIDs in the subtree against the target L0's scope before beginning the transactional move. No mid-transaction collision discovery.
- **Cross-service coordination**: This feature requires coordinated changes across two repositories: server (backend mutations, domain logic) and client-web (frontend UI extensions). Both must be developed and released together.
- **Room handling is a completed dependency (084)**: Communication room handling — comment preservation, membership revocation, updates room recreation — is fully implemented in `084-move-room-handling` via `SpaceMoveRoomsService.handleRoomsDuringMove()`. The 083 move service invokes this as a fire-and-forget post-commit step. The `addContributorToCommunications()` path also includes `batchAddSpaceMember()` for post-move re-population (084 verified this and patched it). No further room-related work is needed in 083.

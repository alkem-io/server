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
3. **Given** Subspace A has community members and leads, **When** it is moved cross-L0 to become an L2, **Then** ALL community roles are cleared including user admins (crossing L0 boundary invalidates the entire community hierarchy).
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
4. **Given** the admin selects "Move under a Subspace" and picks a target L1 in a different L0, **When** they confirm, **Then** the confirmation dialog warns that the space will be demoted to L2, all community roles will be cleared, and content will be moved.
5. **Given** the L1 space has L2 children and the admin selects "Move under a Subspace", **When** the picker appears, **Then** the option is disabled with an explanation that nesting depth would be exceeded.
6. **Given** the resolved space is L0 or L2, **When** the toggle appears, **Then** the "Move" option is not shown (move operations apply only to L1 spaces).

---

### User Story 4 — Auto-Invite Overlapping Members After Move (Priority: P3)

As a platform administrator moving a subspace, I want the option to automatically invite former community members who are also members of the new parent L0 space so that interested users can quickly rejoin the moved subspace without manual re-invitation.

After a cross-L0 move clears community memberships, the platform admin can opt in to sending automatic invitations. The eligible recipients are users who were members of the old community **and** are currently members of the target L0 space's community (the overlap set). The admin can toggle auto-invitations on or off and can edit a pre-generated invitation message before confirming the move.

**Why this priority**: This is a convenience feature that reduces friction after a move. The core move (US1/US2) works without it — admins can always invite members manually afterwards. Auto-invite adds value when a subspace moves between related spaces where most members overlap.

**Independent Test**: Create two L0 spaces with overlapping members. Create an L1 subspace under the first L0 with community members. Move the L1 to the second L0 with auto-invite enabled. Verify that only overlapping members (present in both the old L1 community and the target L0 community) receive invitations with the admin's custom message.

**Acceptance Scenarios**:

1. **Given** the admin enables auto-invite and confirms the move, **When** the move completes, **Then** invitations are sent only to users who were members of the old L1 community and are currently members of the target L0 community.
2. **Given** a user was a member of the old L1 but is NOT a member of the target L0, **When** the move completes with auto-invite enabled, **Then** that user does NOT receive an invitation.
3. **Given** the admin edits the pre-generated invitation message before confirming, **When** invitations are sent, **Then** each invitation contains the admin's custom message.
4. **Given** the admin leaves auto-invite disabled (the default), **When** the move completes, **Then** no invitations are sent — the community is simply cleared.
5. **Given** the overlap set is empty (no old members are members of the target L0), **When** the admin enables auto-invite and confirms the move, **Then** zero invitations are sent and the move succeeds normally.
6. **Given** auto-invite is enabled for an L1→L2 cross-L0 demotion, **When** the move completes, **Then** invitations are sent to the same overlap set (old L1 members ∩ target L0 members). The behavior is identical to L1→L1 moves.

---

### Edge Cases

- **Circular hierarchy prevention**: Moving L1-A under L1-B which is itself under L0-X, when L1-A has an L2 that references L0-X — the system must update all level-zero space references correctly and prevent any structural inconsistency.
- **Self-move / no-op**: Moving an L1 to its current parent L0 is a no-op. The system rejects with a clear message.
- **Depth overflow on cross-L0 L1→L2**: If the source L1 has L2 children, the operation is blocked because children would become L3 (exceeding max depth).
- **NameID collision across L0 boundaries**: The moved space or descendants may have nameIDs that collide with existing entities scoped to the target L0. The system validates before executing.
- **Content in active use**: The move proceeds within its database transaction. Concurrent edits receive a conflict error.
- **Authorization chain reset**: The moved space and its entire subtree must inherit the new parent's authorization chain.
- **Innovation flow mismatch**: When crossing L0 boundaries, the target L0 may have a different innovation flow template. Callout classification tagsets in the moved subtree are synchronized using each space's OWN calloutsSet tagset template. Valid flow state values are preserved; only values absent from the template's `allowedValues` fall back to the default. This means L1/L2 spaces that retain their own innovation flow keep their callouts' current flow states intact after a cross-L0 move.
- **Storage references**: All file and media references remain valid. The storage aggregator parent is updated to the new context.
- **Visibility and privacy preservation**: The space's visibility state (ACTIVE, ARCHIVED, DEMO, INACTIVE) and privacy mode (PUBLIC, PRIVATE) are preserved on move. All visibility states are eligible for cross-L0 moves — no reactivation required.
- **Empty source parent**: After the move, the source L0 may have zero L1 children — this is valid.
- **Network failure during admin UI operation**: Backend mutations are atomic — no partial state. The admin sees an error and can safely retry.
- **Auto-invite with large overlap set**: If hundreds of users overlap, invitations are sent in bulk. The invitation dispatch does not block the move operation's response — it is a post-commit side effect.
- **User is admin/lead in old community but only member in target L0**: The user still receives an invitation (as a regular member invite). The old role level is not carried over.
- **Auto-invite when messaging service is unavailable**: Invitation creation succeeds (database records), but the notification side effect may fail silently — consistent with the fire-and-forget pattern for communication side effects.

## Requirements *(mandatory)*

### Functional Requirements

#### Backend — New Mutation: Move L1 to Different L0

- **FR-001**: System MUST provide a new dedicated mutation (`moveSpaceL1ToSpaceL0`) to move an L1 space to a different L0 space, preserving the space at level 1 and re-parenting it under the target L0.
- **FR-002**: The move MUST transfer the entire subtree — all L2 sub-subspaces and their content move with the L1 space.
- **FR-003**: The move MUST update the level-zero space reference for the moved space and its entire subtree to the target L0.
- **FR-004**: The move MUST clear ALL community memberships (members, leads, admins, organizations, virtual contributors) in the moved space and its descendants. No roles are preserved — the target L0's admins manage the moved space via authorization chain inheritance.
- **FR-005**: The move MUST update the authorization chain of the moved space and its subtree to inherit from the target L0's authorization policies.
- **FR-006**: The move MUST update storage aggregator parent references for the moved space and its nested entities.
- **FR-007**: The move MUST invalidate cached URLs for the moved space and its subtree by revoking each space's profile URL cache entry (following the existing conversion service pattern). Non-space entity caches (callouts, contributions) self-heal via the 1-second cache TTL and require no explicit invalidation.
- **FR-008**: The move MUST validate that no space nameID in the moved subtree collides with existing space nameIDs scoped to the target L0 (L0 itself + all L1/L2 children). Callout, post, and profile nameIDs are not in scope. If a collision is detected, the move is rejected with a clear error identifying the conflicting nameID.
- **FR-009**: The move MUST reject self-moves (moving an L1 to its current parent L0) with a clear message.
- **FR-010**: The move MUST be atomic — single database transaction. If any step fails, the entire operation rolls back. Non-transactional side effects (cache invalidation) use best-effort after commit.
- **FR-011**: The move MUST require platform admin privileges.

#### Backend — Cross-L0 Demotion: L1→L2 Across L0 Boundaries

- **FR-012**: System MUST provide a new dedicated mutation (`moveSpaceL1ToSpaceL2`) to move an L1 space to L2 under a target L1 in a different L0 space. The existing `convertSpaceL1ToSpaceL2` mutation remains unchanged (same-L0 constraint preserved).
- **FR-013**: Cross-L0 demotion MUST reject moves where the source L1 has L2 children, because the children would exceed the maximum nesting depth.
- **FR-014**: Cross-L0 demotion MUST update the level-zero space reference for the moved space to the target L0's ID.
- **FR-015**: Cross-L0 demotion MUST clear ALL community roles including user admins. This differs from the existing within-L0 demotion (which preserves user admins) because crossing the L0 boundary changes the community hierarchy entirely — admin credentials are rooted in the source L0's chain and are meaningless in the target L0's context.
- **FR-016**: Cross-L0 demotion MUST validate nameID uniqueness within the target L0 scope.
- **FR-017**: Cross-L0 demotion MUST require platform admin privileges.

#### Backend — Shared Concerns

- **FR-018**: When a move crosses L0 boundaries, system MUST synchronize callout classification tagsets in the moved subtree using each space's OWN calloutsSet tagset templates (not the target L0's). Valid flow state values (present in the template's `allowedValues`) MUST be preserved; only values no longer in the allowed set fall back to the template's `defaultSelectedValue`. **Bug fix (2026-04-02)**: The underlying `ClassificationService.updateTagsetTemplateOnSelectTagset()` was unconditionally resetting all classification tagsets to the default value. Fixed to check `allowedValues` before resetting — this preserves callout flow states during cross-L0 moves where the innovation flow hasn't changed.
- **FR-019**: System MUST recalculate platform role access (anonymous, guest, registered user visibility) for the moved space and its subtree based on the new parent's access configuration.
- **FR-020**: System MUST set the moved space's sort order to position 0 (first) within its new parent, shifting existing children's sort orders up by 1. The admin can rearrange the order manually afterwards.
- **FR-021**: System MUST preserve the space's visibility state and privacy mode on move.
- **FR-021b**: The move MUST update the Account association of the moved space and its subtree to the target L0's Account. License entitlements MUST be explicitly propagated to the moved subtree after the Account context changes. Quota overflow does not block the move — platform admin authority is sufficient safeguard.

#### Backend — Post-Move Auto-Invitations

- **FR-033**: Both move mutations MUST accept an optional auto-invite flag (default: off) and an optional invitation message string.
- **FR-034**: When auto-invite is enabled, the system MUST compute the overlap set: users who were members of the old L1 community (any role) AND are currently members of the target L0 space's community.
- **FR-035**: For each user in the overlap set, the system MUST create an invitation to join the moved subspace using `RoleSetService.createInvitationExistingActor()` and dispatch a notification via `NotificationUserAdapter.userSpaceCommunityInvitationCreated()`. The invitation MUST include the admin-provided message (or the pre-generated default if unedited). After all invitations are created, authorization policies MUST be applied on the newly created invitations via `RoleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications()` — without this, invitations have bare `AuthorizationPolicy` with no credential rules.
- **FR-036**: Auto-invite processing MUST be a post-commit side effect — it MUST NOT block or delay the move operation's response, and failures MUST NOT roll back the move. Notification dispatch is fire-and-forget (`void`).
- **FR-037**: The invitation triggers the existing `userSpaceCommunityInvitationCreated` notification. No new notification type is introduced. The `CommunityResolverService` resolves the community for notification payloads.
- **FR-038**: If the overlap set is empty, no invitations are created and the move succeeds normally.

#### Frontend — Admin UI Integration

- **FR-022**: The existing Space Conversions section on the Conversions & Transfers admin page MUST be extended to include a "Move" option in the toggle button group when an L1 space is resolved, making the toggle "Promote | Demote | Move".
- **FR-023**: When "Move" is selected, the UI MUST present a move-type selector with two options: "Move to another Space (stays L1)" and "Move under a Subspace in another Space (becomes L2)".
- **FR-024**: For "Move to another Space", the UI MUST provide a searchable picker showing L0 spaces (excluding the current parent L0). The picker filters by spaces where the admin has access.
- **FR-025**: For "Move under a Subspace", the UI MUST provide a searchable picker showing L1 spaces in other L0 spaces (excluding sibling L1 spaces in the same L0 — those are handled by the existing "Demote" operation).
- **FR-026**: "Move under a Subspace" MUST be disabled with an explanation when the source L1 has L2 children (depth overflow).
- **FR-027**: The confirmation dialog for "Move to another Space" MUST warn that community memberships will be cleared, content will move to the new space, innovation flow may differ, and existing URLs/bookmarks to the space will break (no redirects are created).
- **FR-028**: The confirmation dialog for "Move under a Subspace" MUST warn that the space will be demoted to L2, all community roles will be cleared (including admins), the space will be nested under the selected subspace, and existing URLs/bookmarks to the space will break (no redirects are created).
- **FR-029**: The "Move" option MUST only be shown for L1 spaces. L0 and L2 spaces do not show a "Move" toggle option.
- **FR-030**: System MUST display a loading indicator during mutation execution and prevent duplicate submissions.
- **FR-031**: System MUST display clear success messages after successful move operations.
- **FR-032**: System MUST display clear error messages when moves fail (nameID collision, authorization failure, depth overflow).

#### Frontend — Auto-Invite Controls in Confirmation Dialog

- **FR-039**: Both move confirmation dialogs ("Move to another Space" and "Move under a Subspace") MUST include an auto-invite section with a checkbox labeled "Send invitations to community members who are already in the destination space". The checkbox MUST be unchecked by default.
- **FR-040**: The auto-invite section MUST display helper text explaining what it does: that it identifies former community members who are currently members of the target space and sends them an invitation to rejoin. The helper text MUST clarify that only the overlap set is invited — members not present in the target L0 community will not be invited.
- **FR-041**: When the auto-invite checkbox is checked, a message textbox MUST become visible and enabled, pre-populated with a generated invitation message. When unchecked, the textbox MUST be hidden.
- **FR-042**: The pre-generated message MUST reference the subspace name, the source space name, and the destination space name in a human-readable format (e.g., "The subspace '[name]' has moved from '[source]' to '[destination]'. You are invited to join it in its new location.").
- **FR-043**: The admin MUST be able to edit the pre-generated message before confirming. The textbox MUST allow free-form text input.
- **FR-044**: When the admin confirms the move, the UI MUST pass the auto-invite flag (true/false) and the current textbox content (if auto-invite is enabled) to the respective move mutation input.

### Key Entities

- **Space**: Organizational unit at level 0 (space), 1 (subspace), or 2 (sub-subspace). Has a level-zero space reference that tracks which L0 it belongs to. The cross-space move changes this reference for the entire subtree.
- **Community**: Membership container for a space. Contains role assignments (members, admins, leads, facilitators). For L1→L1 cross-L0 moves, all roles are cleared. For L1→L2 cross-L0 demotion, ALL roles are cleared including user admins (crossing L0 boundary invalidates the community hierarchy).
- **Collaboration**: Content container for a space. Holds callouts, posts, whiteboards, discussions, innovation flows — all move intact with the space. Classification tagsets must be resynchronized when crossing L0 boundaries.
- **Authorization**: Hierarchical policy chain. When a space moves to a new parent, the moved subtree must inherit the new parent's authorization chain.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Platform admins can move an L1 subspace from one L0 space to another in a single operation, with all content intact and no data loss.
- **SC-002**: Platform admins can move an L1 subspace to become an L2 under an L1 in a different L0 space, with content preserved and community roles cleared.
- **SC-003**: After any cross-space move, 100% of content (callouts, posts, whiteboards, sub-subspaces) is accessible in the new location.
- **SC-004**: After any cross-space move, 0% of community memberships from the source context persist — ALL roles are cleared (crossing L0 boundary invalidates the entire community hierarchy).
- **SC-005**: NameID collision attempts and depth-overflow attempts are rejected 100% of the time with user-understandable error messages.
- **SC-006**: The move operation completes atomically — either fully succeeds or fully rolls back, with no partial state observable.
- **SC-007**: Platform admins can initiate and complete a cross-space move from the admin UI in under 60 seconds of wall-clock time.
- **SC-008**: The existing promote, demote, and within-L0 operations continue to work identically after the new "Move" option is added.
- **SC-009**: The "Move" option only appears for L1 spaces — L0 and L2 spaces cannot trigger cross-space moves from the UI.
- **SC-010**: When auto-invite is enabled, 100% of overlap-set members (users present in both the cleared community and the target L0 community) receive invitations via the existing invitation mechanism.
- **SC-011**: When auto-invite is disabled (the default), zero invitations are sent as a result of the move operation.

## Clarifications

### Session 2026-03-30

- Q: When an L1 moves to a different L0 (stays L1), should user admins be preserved or should ALL community roles be cleared? → A: Clear ALL roles including admins. The target L0's admins inherit management via authorization chain. ~~This differs from L1→L2 demotion (which preserves user admins)~~ — **Revised 2026-03-31**: L1→L2 cross-L0 also clears ALL roles including admins (see FR-015). The same-L0 vs cross-L0 boundary is the determining factor, not the level change direction. Community memberships are hierarchical under the L0; admin credentials rooted in the source L0's chain are meaningless in the target L0's context.
- Q: How should the two cross-L0 operations be exposed in the GraphQL API — new mutations, extend existing, or single generic? → A: Two new dedicated mutations (`moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`). The existing `convertSpaceL1ToSpaceL2` remains unchanged. This eliminates regression risk to existing operations and gives each move operation a clear semantic name aligned with the frontend's "Move" toggle.
- Q: When source and target L0s have different innovation flow states, how should callout classification tagsets be synchronized? → A: Each space's callouts are synced using that space's OWN calloutsSet tagset template (not the target L0's), because L1/L2 spaces retain their own innovation flow after a cross-L0 move. Valid flow state values (present in the template's `allowedValues`) are preserved; only invalid values fall back to the default. **Note (2026-04-02)**: The original implementation delegated to `ClassificationService.updateTagsetTemplateOnSelectTagset()`, which had a pre-existing bug that unconditionally reset all tags to `defaultSelectedValue`. This was fixed — the method now checks `allowedValues` before resetting. The fix applies to both cross-L0 moves and individual callout transfers.
- Q: When source and target L0s have different Accounts (billing/licensing), what happens to the moved space's Account association? → A: Inherit the target L0's Account. The moved space and its subtree switch to the target's Account, with storage and license quotas recalculated against the target. Consistent with the principle that the moved space fully belongs to the new parent context.
- Q: Can non-ACTIVE spaces (ARCHIVED, DEMO, INACTIVE) be moved cross-L0? → A: Allow all states. Any L1 space can be moved regardless of visibility state. The state is preserved as-is at the new location. No reactivation step required — platform admin privileges are sufficient safeguard.
- Q: What is the exact scope of nameID collision validation (FR-008)? → A: Space nameIDs only — the L0 and all its L1/L2 children. Callouts, posts, and profiles don't have nameIDs that participate in URL routing collisions.

### Session 2026-03-31

- Q: Should user admins be preserved during cross-L0 L1→L2 demotion (consistent with same-L0 demotion), or cleared like the L1→L1 cross-L0 move? → A: Clear ALL roles. The boundary is same-L0 vs cross-L0, not the level change direction. Admin credentials are sub-community of the source L0 — they cannot be preserved across L0 boundaries because the community hierarchy changes entirely. Same-L0 `convertSpaceL1ToSpaceL2` continues to preserve admins (same hierarchy).
- Q: When a space moves and its URL path changes, should the system create redirects from old URLs to new URLs? → A: No redirects — old URLs return not-found after the move. Broken links are accepted for this admin-only operation. The confirmation dialog must warn the admin that existing links to the space will break.
- Q: Should cross-L0 move operations produce a dedicated audit event or activity log entry? → A: No dedicated audit event. Standard server logs (Winston) are sufficient. This is a low-frequency admin operation — existing server logging captures the operation context.
- Q: When community memberships are cleared during a cross-L0 move, should removed members receive a notification? → A: No notification — silent removal. Platform admins communicate the change via their own channels if needed. The auto-invite mechanism (US4) handles re-engagement for overlap members separately.

### Session 2026-04-02

- Q: After a cross-L0 move, all callouts end up in the first flow state instead of retaining their assigned states. Is this a bug? → A: Yes — pre-existing bug in `ClassificationService.updateTagsetTemplateOnSelectTagset()` (line 209). The method unconditionally reset `existingTagset.tags = defaultTags` without checking whether the current value was still valid. Fixed to check `tagsetTemplate.allowedValues` first: if the current tag value is in the allowed set, it is preserved; otherwise it falls back to `defaultSelectedValue`. This fix applies to both the `syncInnovationFlowTagsetsForSubtree` path (cross-L0 moves) and the `CalloutTransferService.updateClassificationFromTemplates` path (individual callout transfers).
- Q: The auto-invite mechanism used `InvitationService.createInvitation()` which doesn't exist on `InvitationService`. How should invitations be created? → A: Use `RoleSetService.createInvitationExistingActor()` — this is the standard invitation creation path used by the rest of the codebase. Additionally, notification dispatch must be explicit via `NotificationUserAdapter.userSpaceCommunityInvitationCreated()`, and authorization policies must be applied on newly created invitations via `RoleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications()` after the batch is complete.
- Q: The `ConversionModule` imported `InvitationModule` for auto-invite support. Is this the right dependency? → A: No. Replaced with `NotificationAdapterModule` (for `NotificationUserAdapter`) and `EntityResolverModule` (for `CommunityResolverService`). The invitation creation itself goes through `RoleSetService` which is already imported via `RoleSetModule`.

## Assumptions

- **Platform admin only**: Cross-space moves require platform admin privileges. No space-level admin can trigger cross-L0 moves — this is a deliberate safety constraint given the impact (community clearing, authorization chain reset).
- **Content moves, users don't**: All community role assignments are cleared. The community entity is preserved but emptied. The moved space inherits authorization from the new parent — the new parent's admins manage the moved space.
- **Existing mutations unchanged**: The current `convertSpaceL1ToSpaceL2` (same-L0 constraint) and all other existing conversion mutations remain untouched. Cross-L0 operations use two new dedicated mutations (`moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`), avoiding any regression risk to existing behavior.
- **Subtree moves intact**: The entire subtree (L2 children and their content) moves with the L1. Individual child extraction is not in scope.
- **Auto-invite is opt-in (US4)**: The admin may optionally invite former community members who overlap with the target L0's community. This is off by default. When enabled, invitations are sent via the existing invitation mechanism and notification — no new notification type is introduced. Members who are not part of the target L0's community are not eligible and receive no invitation.
- **Storage references remain valid**: Files and media remain accessible via existing references after the storage aggregator parent is updated.
- **Frontend integrates into existing page**: The UI for cross-space moves is added to the existing Conversions & Transfers page (`025-admin-transfer-ui`) — not a new page. It extends the L1 space toggle from "Promote | Demote" to "Promote | Demote | Move".
- **Innovation flow synchronization uses existing patterns**: Callout classification tagset synchronization delegates to `ClassificationService.updateTagsetTemplateOnSelectTagset()`. Each space's callouts are synced against that space's OWN calloutsSet tagset template. Valid flow state values are preserved; only invalid values fall back to default. **(Updated 2026-04-02)**: The underlying method was fixed to check `allowedValues` before resetting — previously it unconditionally reset all tags to `defaultSelectedValue`.
- **NameID collision is checked before the move**: The system validates all nameIDs in the subtree against the target L0's scope before beginning the transactional move. No mid-transaction collision discovery.
- **Cross-service coordination**: This feature requires coordinated changes across two repositories: server (backend mutations, domain logic) and client-web (frontend UI extensions). Both must be developed and released together.
- **Room handling is a completed dependency (084)**: Communication room handling — comment preservation, membership revocation, updates room recreation — is fully implemented in `084-move-room-handling` via `SpaceMoveRoomsService.handleRoomsDuringMove()`. The 083 move service invokes this as a fire-and-forget post-commit step. The `addContributorToCommunications()` path also includes `batchAddSpaceMember()` for post-move re-population (084 verified this and patched it). No further room-related work is needed in 083.

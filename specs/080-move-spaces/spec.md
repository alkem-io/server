# Feature Specification: Move Spaces

**Feature Branch**: `080-move-spaces`
**Created**: 2026-03-16
**Status**: Draft
**Input**: GitHub Issue [#5898](https://github.com/alkem-io/server/issues/5898) — Move Spaces
**Scope**: Cross-service — backend (server) and frontend (client-web)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Move Subspace to Another Space (Priority: P1)

As two partnering initiatives, I want to move a subspace from our old space to a new shared space so that we can consolidate our collaborative work under a single organizational home.

A subspace (level 1) is transferred from its current parent space to a different parent space. The entire subtree — including all sub-subspaces (level 2) and their content — moves with it. Community memberships are not transferred; the moved subspace starts fresh in the new parent's community context.

**Why this priority**: This is the most commonly requested reorganization operation. It enables partners, merging teams, and evolving organizations to restructure their collaboration without recreating content from scratch.

**Independent Test**: Can be fully tested by creating two spaces, adding a subspace with content (callouts, posts) to the first, moving it to the second, and verifying all content appears in the new location while community memberships are cleared.

**Acceptance Scenarios**:

1. **Given** a subspace with callouts and posts exists in Space A, **When** an authorized user moves it to Space B, **Then** the subspace and all its content appear under Space B, and it no longer appears under Space A.
2. **Given** a subspace has two sub-subspaces, **When** it is moved to a different space, **Then** both sub-subspaces and their content move with the parent subspace.
3. **Given** a subspace has community members (admins, facilitators, regular members), **When** it is moved, **Then** all community memberships are cleared in the moved subspace and its sub-subspaces.
4. **Given** a user lacks admin privileges on the target space, **When** they attempt to move a subspace to that space, **Then** the operation is rejected with an authorization error.

---

### User Story 2 — Move Space to Another Account (Priority: P2)

As the Alkemio platform team, I want to transfer a space from one account to another so that organizational changes (mergers, team restructuring, license transfers) are handled without destroying and recreating content.

A top-level space (level 0) is transferred from its current hosting account to a different account. All subspaces, sub-subspaces, and content move with the space. Community memberships are not transferred.

**Why this priority**: This is an essential platform administration capability. Without it, migrating a space between organizations requires manual content recreation — error-prone and time-consuming.

**Independent Test**: Can be fully tested by creating two accounts, each hosting a space, then transferring one space to the other account and verifying content integrity.

**Acceptance Scenarios**:

1. **Given** a space hosted by Account A, **When** a platform admin transfers it to Account B, **Then** the space and all its subspaces/content appear under Account B.
2. **Given** a space has subspaces and sub-subspaces, **When** it is transferred to another account, **Then** the full hierarchy and all content move intact.
3. **Given** a space has community members, **When** it is transferred, **Then** all community memberships across the entire hierarchy are cleared.
4. **Given** a user without platform admin privileges, **When** they attempt to move a space between accounts, **Then** the operation is rejected.

---

### User Story 3 — Promote Sub-subspace to Subspace (Priority: P3)

As a space owner, I want to promote a sub-subspace to become a direct subspace of my space so that I can elevate important work that has outgrown its current nesting level.

A sub-subspace (level 2) is moved up one level to become a subspace (level 1) within the same top-level space. Its content moves with it. Community memberships are not transferred.

**Why this priority**: This supports natural evolution of work within a space — ideas that start small in a sub-subspace may grow in importance and deserve more visibility as a subspace.

**Independent Test**: Can be fully tested by creating a space with a subspace containing a sub-subspace, promoting the sub-subspace, and verifying it appears as a direct subspace of the top-level space.

**Acceptance Scenarios**:

1. **Given** a sub-subspace under Subspace A in Space X, **When** the space owner promotes it, **Then** it becomes a direct subspace of Space X at level 1.
2. **Given** a sub-subspace with callouts and posts, **When** it is promoted, **Then** all content is preserved in the promoted subspace.
3. **Given** a sub-subspace with community members, **When** it is promoted, **Then** community memberships are cleared.

---

### User Story 4 — Move Subspace to Be a Sub-subspace (Priority: P4)

As a space facilitator, I want to nest a subspace under another subspace so that I can group related work together under a common theme.

A subspace (level 1) is moved down one level to become a sub-subspace (level 2) under a different subspace within the same or a different space. Its content moves with it. Community memberships are not transferred.

**Why this priority**: This is the inverse of promotion and completes the reorganization toolkit. It enables facilitators to create logical groupings as the space's content evolves.

**Independent Test**: Can be fully tested by creating a space with two subspaces, moving one to be a sub-subspace of the other, and verifying the hierarchy change and content preservation.

**Acceptance Scenarios**:

1. **Given** Subspace A and Subspace B exist in Space X, **When** an authorized user moves Subspace A under Subspace B, **Then** Subspace A becomes a sub-subspace (level 2) of Subspace B.
2. **Given** a subspace that already has sub-subspaces, **When** a user attempts to move it to become a sub-subspace, **Then** the operation is rejected because the children would exceed the maximum nesting depth.
3. **Given** a subspace with no children, **When** it is moved under another subspace in a different space, **Then** it appears as a sub-subspace in the target space and is removed from its original parent.

---

### User Story 5 — Promote Subspace to Space (Priority: P5)

As an initiative that has grown beyond its parent space, I want to promote a subspace to become an independent top-level space so that it can operate autonomously under its own account.

A subspace (level 1) is promoted to become a top-level space (level 0). It must be assigned to a target account that will host it. All sub-subspaces become subspaces (level 1) of the newly promoted space. Community memberships are not transferred.

**Why this priority**: This is the most complex operation — it changes the hosting account relationship and adjusts levels for the entire subtree. It represents the natural end-state for initiatives that outgrow their parent space.

**Independent Test**: Can be fully tested by creating a space with a subspace (containing sub-subspaces), promoting the subspace to a space under a specified account, and verifying hierarchy adjustment and content preservation.

**Acceptance Scenarios**:

1. **Given** Subspace A with two sub-subspaces exists in Space X, **When** an authorized user promotes it to a space under Account B, **Then** Subspace A becomes a level 0 space hosted by Account B, and its sub-subspaces become level 1 subspaces.
2. **Given** a subspace with content across its subtree, **When** it is promoted to a space, **Then** all content in the entire subtree is preserved.
3. **Given** a subspace with community members, **When** it is promoted, **Then** all community memberships across the subtree are cleared.
4. **Given** a user without admin privileges on the target account, **When** they attempt to promote a subspace to a space, **Then** the operation is rejected.
5. **Given** the target account has reached its license limit for hosted spaces, **When** an authorized user promotes a subspace to a space under that account, **Then** the system warns about the license discrepancy but completes the promotion.

---

### Edge Cases

- **Circular moves**: What happens when a user tries to move a space under one of its own descendants? The operation must be rejected to prevent circular hierarchies.
- **Self-move**: What happens when a user tries to move a space to its current parent? The operation should be a no-op or return a clear message that the space is already in the requested location.
- **Depth overflow on move**: What happens when moving a subspace (with sub-subspaces) to become a sub-subspace? The operation must be rejected because children would exceed the maximum depth (level 2).
- **Empty source parent**: What happens when the moved space is the only child? The parent should end up with zero children — this is valid and must not be blocked.
- **Content in active use**: What happens when content within the space is being actively edited during a move? The system should either complete the move atomically or reject concurrent modifications gracefully.
- **Authorization chain reset**: What happens to authorization policies after a move? The moved space and its subtree must inherit the authorization chain of the new parent.
- **Move to same space**: What happens when moving a sub-subspace to be a subspace of the same top-level space it already belongs to (promotion within the same space tree)? This should work — it is a valid promotion.
- **Storage and file references**: What happens to uploaded files and media in the moved space? All storage references must remain valid after the move.

## User Interaction Requirements

These requirements apply to the frontend (client-web) and describe how users interact with move operations.

### Initiating a Move

- **UIR-001**: Users MUST be able to initiate a move/promote operation from the space's settings or context menu. The option MUST only be visible to users with sufficient privileges.
- **UIR-002**: Users MUST be presented with a destination picker that allows them to browse and select the target location (parent space or account). The picker MUST only show valid destinations (e.g., no circular targets, no depth-overflow targets).
- **UIR-003**: For L1→L0 promotion, users MUST be presented with an account selector to choose the hosting account for the new space.

### Confirmation and Feedback

- **UIR-004**: Before executing any move, users MUST see a confirmation dialog that clearly states: the space being moved, the target destination, and that community memberships will be cleared.
- **UIR-005**: When a move would cause a license entitlement discrepancy on the target account, the confirmation dialog MUST display a warning about the license impact while still allowing the user to proceed.
- **UIR-006**: Users MUST receive clear feedback on the outcome — success (with the new location), failure (with the reason), or rejection (authorization, circular reference, depth overflow).
- **UIR-007**: During the move operation, the interface MUST indicate that the operation is in progress and prevent duplicate submissions.

### Navigation After Move

- **UIR-008**: After a successful move, users MUST be navigated to the space in its new location.
- **UIR-009**: If a user navigates to the space's old URL after a move, the system SHOULD redirect to the new location or display a message indicating the space has been moved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow moving a subspace (level 1) from one space to another space, preserving the subspace and its entire subtree (sub-subspaces and their content).
- **FR-002**: System MUST allow transferring a top-level space (level 0) from one account to another account, preserving the space's full hierarchy and content.
- **FR-003**: System MUST allow promoting a sub-subspace (level 2) to become a subspace (level 1) within its grandparent space.
- **FR-004**: System MUST allow moving a subspace (level 1) to become a sub-subspace (level 2) under another subspace, provided the moved subspace has no children.
- **FR-005**: System MUST allow promoting a subspace (level 1) to become a top-level space (level 0) under a specified target account, adjusting all descendant levels accordingly.
- **FR-006**: System MUST clear all community memberships (member, admin, facilitator roles) in the moved space and its entire subtree upon any move or promotion operation.
- **FR-007**: System MUST update the authorization chain of the moved space and its subtree to inherit from the new parent's authorization policies.
- **FR-008**: System MUST reject any move that would create a circular hierarchy (moving a space under one of its own descendants).
- **FR-009**: System MUST reject any move that would cause a space to exceed the maximum nesting depth (level 2).
- **FR-010**: System MUST preserve all content within the moved space — including collaboration data (callouts, posts, whiteboards, discussions), profiles, settings, templates, innovation flows, and storage references.
- **FR-011**: System MUST require authorization from both the source container's admin and the target container's admin for cross-container moves.
- **FR-012**: System MUST require platform admin privileges for moving a space between accounts (FR-002).
- **FR-013**: System MUST perform the move as an atomic operation — if any step fails, the entire operation must be rolled back with no partial state changes.
- **FR-014**: System MUST update sort order and display position of the moved space within its new parent context.
- **FR-015**: When promoting a subspace to a space (L1→L0), the system MUST assign the user performing the promotion as the initial admin of the promoted space's community.
- **FR-016**: When moving or promoting a space to an account that would exceed its license entitlements (either via account-to-account transfer or L1→L0 promotion), the system MUST warn the user about the license discrepancy but MUST NOT block the operation.

### Key Entities

- **Space**: The core organizational unit, existing at levels 0 (space), 1 (subspace), or 2 (sub-subspace). Has a parent-child relationship with other spaces, belongs to an account, and contains a community, collaboration, profile, and settings.
- **Account**: The hosting entity for top-level spaces. Determines licensing, billing, and administrative ownership.
- **Community**: The membership container for a space. Contains role assignments (members, admins, facilitators) that are cleared upon space relocation.
- **Collaboration**: The content container for a space. Holds callouts, posts, whiteboards, discussions, innovation flows, and timelines — all of which move with the space.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized users can move a subspace between spaces and verify all content is intact within 30 seconds for typical spaces (up to 50 callouts).
- **SC-002**: After any move operation, 100% of content (callouts, posts, whiteboards, discussions) is accessible in the new location with no data loss.
- **SC-003**: After any move operation, 0% of community memberships from the source location persist in the moved space — all roles are cleared.
- **SC-004**: Circular move attempts and depth-overflow attempts are rejected 100% of the time with clear error messages.
- **SC-005**: Platform administrators can transfer a space between accounts in a single operation, eliminating the need to manually recreate spaces.
- **SC-006**: The move operation completes atomically — either fully succeeds or fully rolls back, with no partial state observable by users.
- **SC-007**: Authorization chains in the moved subtree correctly reflect the new parent within the same operation, with no manual re-authorization needed.
- **SC-008**: Users can discover and initiate a move operation from the space interface without external documentation or support guidance.
- **SC-009**: The destination picker only presents valid targets — users cannot accidentally select a circular or depth-violating destination.
- **SC-010**: After a successful move, users land on the space in its new location within 2 seconds of the operation completing.

## Clarifications

### Session 2026-03-16

- Q: After community memberships are cleared on move, who gets initial admin access to manage the moved space? → A: The mover becomes admin only when promoting a subspace to a space (L1→L0). For all other move types, the target parent container's admin manages the moved space via authorization inheritance.
- Q: Should moves be blocked if the target account's license limits would be exceeded? → A: Warn the user but allow the move to proceed (soft enforcement). License discrepancies are resolved after the fact by platform admins.
- Q: Should space moves have a dedicated audit trail? → A: No — rely on existing application logs. A dedicated audit trail may be added later if operational need arises.
- Q: Should L1→L0 promotion also check the target account's license entitlements? → A: Yes. The same soft enforcement (warn but allow) applies when promoting a subspace to a space, since the promoted space is assigned to the target account.
- Q: What is the service scope of this feature? → A: Cross-service — backend (server repo) and frontend (client-web repo). Added UIR-001 through UIR-009 for user interaction requirements, SC-008 through SC-010 for frontend success criteria, and cross-service coordination assumption.

## Assumptions

- **Subtree moves intact**: When a space is moved, its entire subtree (children, grandchildren) moves with it. Individual child extraction is a separate operation.
- **Community cleared, not restructured**: "Users are not transferred" means all community role assignments are removed. The community entity itself is preserved but emptied. For subspace-level moves (L1→L1, L2→L1, L1→L2), the target parent's admin manages the moved space via authorization inheritance. For L1→L0 promotion, the user performing the move automatically becomes the initial admin of the promoted space.
- **Target account required for promotion to space**: When promoting a subspace (L1) to a space (L0), the caller must specify the target account. The system does not auto-create accounts.
- **Authorization defaults**: Cross-container moves (between different spaces) require admin privileges on both the source and target containers. Within-space promotions/demotions require admin privileges on the parent space. Account-to-account transfers require platform admin privileges.
- **Existing sorting/pinning unaffected**: The move feature is independent of display ordering within a parent. The moved space receives a default sort position in its new parent.
- **No cascading notifications**: The initial implementation does not send notifications to former community members about the move. This may be added as a follow-up enhancement.
- **Storage references remain valid**: Files and media uploaded within the moved space continue to be accessible via their existing references. The storage aggregator is updated to reflect the new parent context.
- **Cross-service coordination**: This feature requires coordinated changes across two repositories: the server (backend — GraphQL API, domain logic, data operations) and client-web (frontend — UI for initiating moves, destination picker, confirmation dialogs, post-move navigation). Both must be developed and released together.

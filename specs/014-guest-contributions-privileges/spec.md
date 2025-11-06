# Feature Specification: Guest Contributions Privilege Management

**Feature Branch**: `014-guest-contributions-privileges`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "Add the next steps of the functionality which was started with adding a new setting to a space's collaboration set of settings: allowGuestContributions. It enables spaces to allow or block guest contributions via a new allowGuestContributions setting in space configuration. When ON, the backend grants PUBLIC_SHARE privilege to all space admins and to owners of whiteboards within that space, automatically reflecting these privileges both on existing and newly created whiteboards. The privilege is per whiteboard inside this space or subspace only. There is no inheritance space > subspace of the settings, privileges, or anything. Per whiteboard only for its own creator and for the admins of the respective space or subspace. The client adapts the Share dialog: it performs authorization checks so only users with PUBLIC_SHARE on a whiteboard see the 'Guest access' toggle. When the setting is OFF, all guest contribution UI is hidden and all relevant privileges are revoked by the backend. This ensures permissions and UI stay consistent and correctly reflect the space's desired collaboration mode."

## Clarifications

### Session 2025-11-05

- Q: What should happen if privilege assignment fails partway through (e.g., database error after granting to some admins but not all)? → A: Rollback all changes and return error - maintain consistent state across all users
- Q: What events/metrics should be logged when privilege rules are added or omitted during authorization reset? → A: Log privilege rule modifications with user/whiteboard IDs + emit metrics on operation count/duration
- Q: What is the expected maximum number of whiteboards per space for performance validation? → A: 1000 whiteboards per space
- Q: Should privilege rule modifications be audited for compliance tracking? → A: Yes, audit all privilege rule changes with triggering user/action during authorization reset
- Q: Should the system track who/when triggered a privilege change for troubleshooting? → A: Track triggering event only (setting change/admin grant/whiteboard creation)
- Q: If privilege assignment fails when enabling allowGuestContributions, should the setting be reverted? → A: Yes, revert allowGuestContributions to false in space collaboration settings

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Automatic privilege granting when guest contributions enabled (Priority: P1)

When a space admin enables the allowGuestContributions setting for their space, all space admins automatically receive the PUBLIC_SHARE privilege on all whiteboards in that space, and each whiteboard owner receives PUBLIC_SHARE privilege on their own whiteboard, enabling them to control guest access at the whiteboard level without manual privilege assignment.

**Why this priority**: This is the core capability that makes guest contributions functional - without automatic privilege granting, space admins would need to manually configure each whiteboard, creating friction and reducing feature adoption.

**Independent Test**: Enable allowGuestContributions on a space with existing whiteboards and verify that all space admins immediately gain PUBLIC_SHARE privilege on all whiteboards in that space, and each whiteboard owner gains PUBLIC_SHARE on their own whiteboard. Create a new whiteboard and verify the creator automatically receives PUBLIC_SHARE.

**Acceptance Scenarios**:

1. **Given** a space has allowGuestContributions enabled, **When** a space admin views their privileges on any whiteboard in that space, **Then** they have PUBLIC_SHARE privilege on all whiteboards in that space.
2. **Given** a space has allowGuestContributions enabled, **When** a user creates a new whiteboard in that space, **Then** the creator automatically receives PUBLIC_SHARE privilege on that whiteboard and all space admins receive PUBLIC_SHARE privilege on that whiteboard.
3. **Given** a space has allowGuestContributions enabled and contains existing whiteboards, **When** the setting is toggled to ON, **Then** all space admins immediately receive PUBLIC_SHARE privilege on all whiteboards in that space, and all whiteboard owners receive PUBLIC_SHARE privilege on their own whiteboards.
4. **Given** a whiteboard exists in a space, **When** allowGuestContributions is enabled, **Then** all space admins (not subspace admins) receive PUBLIC_SHARE privilege on that whiteboard, and the whiteboard owner receives PUBLIC_SHARE privilege on that specific whiteboard.

---

### User Story 2 - Automatic privilege revocation when guest contributions disabled (Priority: P1)

When a space admin disables the allowGuestContributions setting for their space, the system automatically revokes PUBLIC_SHARE privileges from all whiteboards in that space, ensuring immediate consistency between the space policy and actual permissions.

**Why this priority**: Security and consistency require that disabling guest contributions immediately removes the capability to share with guests - delayed or incomplete revocation creates security vulnerabilities.

**Independent Test**: Disable allowGuestContributions on a space where users have PUBLIC_SHARE privileges and verify that all PUBLIC_SHARE privileges are immediately revoked from all whiteboards in that space.

**Acceptance Scenarios**:

1. **Given** a space has allowGuestContributions enabled with whiteboards having PUBLIC_SHARE privileges, **When** an admin disables allowGuestContributions, **Then** PUBLIC_SHARE privileges are immediately revoked from all whiteboards in that space.
2. **Given** allowGuestContributions is disabled for a space, **When** a user creates a new whiteboard in that space, **Then** no user receives PUBLIC_SHARE privilege on that whiteboard.
3. **Given** a space admin has PUBLIC_SHARE privilege on a whiteboard, **When** allowGuestContributions is disabled, **Then** that admin loses PUBLIC_SHARE privilege on that whiteboard.

---

### User Story 3 - Per-whiteboard privilege scope without inheritance (Priority: P2)

The PUBLIC_SHARE privilege is scoped to individual whiteboards only, with no inheritance from space to subspace or across whiteboards, ensuring fine-grained control where each whiteboard's sharing permissions are independently managed based on the space or subspace it belongs to.

**Why this priority**: Clear privilege boundaries prevent unintended access propagation and make the system behavior predictable and auditable - users know exactly which whiteboards they can control guest access for.

**Independent Test**: Create a space with subspaces, enable allowGuestContributions on the parent space only, and verify that whiteboards in subspaces do not receive PUBLIC_SHARE privileges unless the subspace also has allowGuestContributions enabled.

**Acceptance Scenarios**:

1. **Given** a space has allowGuestContributions enabled, **When** a subspace exists within that space, **Then** the subspace's allowGuestContributions setting is independent and does not inherit from the parent.
2. **Given** a whiteboard exists in a subspace, **When** only the parent space has allowGuestContributions enabled, **Then** users do not receive PUBLIC_SHARE privilege on that whiteboard.
3. **Given** a whiteboard exists in a subspace, **When** the subspace has allowGuestContributions enabled, **Then** only the subspace admins and the whiteboard owner receive PUBLIC_SHARE privilege on that whiteboard.
4. **Given** a user has PUBLIC_SHARE on one whiteboard, **When** they view another whiteboard in the same space, **Then** they do not automatically have PUBLIC_SHARE on the second whiteboard unless they are a space admin or that whiteboard's owner.

---

### User Story 4 - New space admin privilege assignment (Priority: P3)

When a user is granted space admin privileges on a space that has allowGuestContributions enabled, they automatically receive PUBLIC_SHARE privilege on all whiteboards in that space because the credential rule for space admins is already embedded in every whiteboard authorization policy.

**Why this priority**: Ensures that privilege state remains consistent regardless of when a user becomes a space admin - new admins should have the same capabilities as existing admins.

**Independent Test**: Grant admin privileges to a user on a space with allowGuestContributions enabled and verify they immediately receive PUBLIC_SHARE privilege on all whiteboards in that space.

**Acceptance Scenarios**:

1. **Given** a space has allowGuestContributions enabled, **When** a user is granted space admin privileges, **Then** they automatically receive PUBLIC_SHARE privilege on all whiteboards in that space.
2. **Given** a space has allowGuestContributions disabled, **When** a user is granted space admin privileges, **Then** they do not receive PUBLIC_SHARE privilege on any whiteboards.
3. **Given** a user is granted space admin privileges on a space with allowGuestContributions enabled, **When** they verify their privileges, **Then** their privilege state matches that of existing space admins.

---

### Edge Cases

- **New space admin assignment**: When a user is newly granted space admin privileges on a space with allowGuestContributions enabled, they receive PUBLIC_SHARE privilege on all whiteboards synchronously with the admin role grant.
- **Cross-boundary privilege scope**: A user who is an admin of both a parent space and a subspace only receives PUBLIC_SHARE for whiteboards in spaces where allowGuestContributions is enabled, not based on their role inheritance.
- **Privilege timing**: When allowGuestContributions is toggled ON, privilege assignment happens synchronously and immediately reflects in authorization checks - no delay or eventual consistency.
- **Privilege ownership**: PUBLIC_SHARE privilege is automatically assigned during authorization reset based on the allowGuestContributions setting and user roles; cannot be manually assigned or removed while the setting is enabled. Because each whiteboard authorization policy always contains the space-admin credential rule, any newly assigned space admin inherits PUBLIC_SHARE immediately without forcing an additional authorization reset.
- **New whiteboard creation**: When a whiteboard is created in a space with allowGuestContributions enabled, the creator receives PUBLIC_SHARE privilege atomically with whiteboard creation.
- **Authorization check performance**: Authorization checks for PUBLIC_SHARE privilege must complete within acceptable UI interaction timeframes to avoid blocking the Share dialog rendering.
- **Concurrent setting changes**: If multiple admins toggle allowGuestContributions simultaneously, the last write wins and privilege state converges to match the final setting value.
- **Partial failure handling**: If privilege assignment fails partway through (e.g., database error after granting to some users), the system MUST rollback all privilege changes AND revert the allowGuestContributions setting to false, then return an error to maintain consistent state across all users and settings.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST automatically grant PUBLIC_SHARE privilege on all whiteboards in a space to all space admins when allowGuestContributions is enabled for that space.
- **FR-002**: System MUST automatically grant PUBLIC_SHARE privilege to whiteboard owners on their own whiteboards when allowGuestContributions is enabled for the space containing that whiteboard.
- **FR-003**: System MUST grant PUBLIC_SHARE privilege on a per-whiteboard basis only - no privilege inheritance across whiteboards or from space to subspace.
- **FR-004**: System MUST automatically grant PUBLIC_SHARE privilege to the creator on their whiteboard and to all space admins on that whiteboard when a new whiteboard is created in a space with allowGuestContributions enabled.
- **FR-005**: System MUST immediately revoke all PUBLIC_SHARE privileges on whiteboards within a space when allowGuestContributions is disabled for that space.
- **FR-006**: System MUST ensure that the space-admin credential always grants PUBLIC_SHARE on all whiteboards in spaces where allowGuestContributions is enabled so that newly granted space admins inherit the privilege immediately without requiring an additional authorization reset.
- **FR-007**: System MUST scope PUBLIC_SHARE privileges to the space or subspace containing the whiteboard - subspace admins receive privileges only for whiteboards in their subspace, not parent spaces.
- **FR-008**: System MUST handle privilege granting and revocation synchronously when allowGuestContributions setting is toggled to ensure immediate consistency (via authorization reset cascade; `applyAuthorizationPolicy()` is synchronous).
- **FR-009**: System MUST rollback all privilege changes AND revert allowGuestContributions setting to false if privilege assignment fails partway through, maintaining consistent state across all users and settings.
- **FR-010**: System MUST log all privilege rule modifications with user ID, whiteboard ID, space ID, and timestamp during authorization reset for audit trail and troubleshooting.
- **FR-011**: System MUST emit metrics tracking the count and duration of privilege assignment operations for operational monitoring.
- **FR-012**: System MUST audit all privilege rule changes during authorization reset, recording the triggering user, triggering action (setting change or whiteboard creation), affected users, and timestamp for compliance tracking.
- **FR-013**: System MUST track the triggering event type (setting change or whiteboard creation) for each privilege assignment to support troubleshooting and operational analysis.

### Key Entities

- **Whiteboard**: Collaborative canvas entity that can be shared with guests when PUBLIC_SHARE privilege is granted to authorized users.
- **PUBLIC_SHARE Privilege**: Authorization grant that enables a user to control guest access for a specific whiteboard through the Share dialog.
- **Space/Subspace**: Hierarchical organizational containers with independent allowGuestContributions settings that determine privilege granting behavior for whiteboards within their scope.
- **Space Admin**: User role that automatically receives PUBLIC_SHARE privilege on all whiteboards within their space (not subspaces) when allowGuestContributions is enabled.
- **Whiteboard Owner**: User who created a whiteboard and automatically receives PUBLIC_SHARE privilege on that specific whiteboard when allowGuestContributions is enabled for the containing space.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: When allowGuestContributions is enabled, all space admins receive PUBLIC_SHARE privilege on all whiteboards in that space, and all whiteboard owners receive PUBLIC_SHARE on their own whiteboards, within 1 second.
- **SC-002**: When allowGuestContributions is disabled, all PUBLIC_SHARE privileges are revoked within 1 second.
- **SC-003**: When a user is granted space admin privileges on a space with allowGuestContributions enabled, they receive PUBLIC_SHARE privilege on all whiteboards in that space immediately via the existing credential rule (observable in authorization checks within 1 second).
- **SC-004**: 100% consistency between allowGuestContributions setting state and PUBLIC_SHARE privilege existence across all whiteboards in a space.
- **SC-005**: Zero privilege inheritance violations - PUBLIC_SHARE is only granted based on the specific space/subspace containing the whiteboard, not parent spaces.
- **SC-006**: System maintains performance targets (1 second for privilege operations) for spaces containing up to 1000 whiteboards.

## Assumptions

- The allowGuestContributions setting already exists in SpaceSettingsCollaboration (implemented in spec 013-guest-contributions-policy).
- The PUBLIC_SHARE privilege type is already defined in the authorization system.
- Whiteboard ownership is clearly tracked and can be queried efficiently.
- Space and subspace admin roles are clearly defined and can be queried for privilege assignment.
- Authorization checks are performant enough for privilege assignment operations.
- The authorization reset cascade is triggered by allowGuestContributions setting changes; embedded credential rules ensure newly added space admins inherit PUBLIC_SHARE without forcing an additional reset.

## Dependencies

- **Spec 013-guest-contributions-policy**: Provides the allowGuestContributions setting infrastructure that this feature extends.
- **Authorization Service**: Must support per-resource privilege assignment and efficient authorization checks.
- **Whiteboard Service**: Whiteboard creation inherits parent authorization with settings propagated through cascade.
- **Space Service**: Space settings changes trigger authorization cascade when allowGuestContributions is modified.
- **Space Admin Management**: Admin role changes issue space-admin credentials that whiteboard policies already recognize for PUBLIC_SHARE, eliminating the need for an extra authorization reset.

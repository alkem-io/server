# Feature Specification: Space Member File Upload for Callout Creation

**Feature Branch**: `102-space-member-file-upload`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User description: "Allow space members who are permitted to create callouts to upload files to the space-level storage location so callout creation with images works for members"

## User Scenarios & Testing *(mandatory)*

A Space can be configured so that ordinary members — not just administrators — are
allowed to create callouts. When a member creates a callout, the callout's content
(for example, an image embedded in the callout description) must be uploaded
*before* the callout itself exists. Because the new callout has no storage of its
own yet, that content is staged in the Space's shared storage location and then
relocated onto the callout once it is created.

Today, members who are permitted to create callouts are nonetheless blocked when
their callout includes an uploaded file: they are not allowed to write to the
Space's shared storage location, so the upload is rejected and callout creation
fails. This feature closes that gap so the "members may create callouts" setting
actually enables the full creation flow, including embedded files.

### User Story 1 - Member creates a callout containing an image (Priority: P1)

A member of a Space whose settings allow members to create callouts opens the
"create callout" flow, writes a description that includes an embedded image (or
otherwise attaches a file), and submits it. The callout is created successfully
and the uploaded file appears as part of the callout.

**Why this priority**: This is the core promise of the "members may create
callouts" setting. Without it, the setting is effectively broken for any callout
that includes uploaded content, and members hit a permission error mid-flow.

**Independent Test**: In a Space configured to allow members to create callouts,
sign in as a plain member (no admin role), create a callout whose description
contains an uploaded image, and confirm the callout is created with the image
intact and no permission error is shown.

**Acceptance Scenarios**:

1. **Given** a Space whose settings allow members to create callouts, **When** a
   member creates a callout with an embedded image, **Then** the upload succeeds
   and the callout is created with the image attached.
2. **Given** the same Space and member, **When** the member uploads a file as part
   of callout creation, **Then** the staged file is relocated to belong to the new
   callout once it exists (no orphaned or inaccessible files remain).
3. **Given** the same Space, **When** an administrator creates a callout with an
   embedded image, **Then** it continues to succeed exactly as before.

---

### User Story 2 - Upload ability is gated by the create-callout setting (Priority: P2)

The file-upload ability granted to members is tied to the Space's "members may
create callouts" setting. When that setting is turned off, members regain no extra
ability to write to the Space's shared storage and cannot create callouts.

**Why this priority**: The grant must not become a permanent, unconditional
privilege escalation. A member should only be able to upload to the Space's shared
storage because — and while — they are allowed to create callouts there.

**Independent Test**: In a Space where members are *not* allowed to create
callouts, sign in as a plain member and confirm they can neither create a callout
nor upload a file to the Space's shared storage location.

**Acceptance Scenarios**:

1. **Given** a Space whose settings do **not** allow members to create callouts,
   **When** a member attempts to create a callout, **Then** the action is denied.
2. **Given** a Space whose setting is later turned off, **When** the Space's
   permissions are next refreshed, **Then** members no longer have the ability to
   upload to the Space's shared storage location.

---

### User Story 3 - Correct scoping across spaces and subspaces (Priority: P3)

Each Space governs its own members independently. Enabling the setting in one Space
must not grant upload ability to members of a different Space, and a subspace's
members are governed by that subspace's own setting.

**Why this priority**: Prevents the grant from leaking across the space hierarchy
or to unrelated spaces, which would be an unintended access change.

**Independent Test**: Enable the setting in Space A and leave it disabled in
Space B; confirm Space A members gain the upload ability only within Space A, and
Space B members gain nothing. Repeat for a subspace relative to its parent.

**Acceptance Scenarios**:

1. **Given** the setting is enabled in Space A and disabled in Space B, **When**
   permissions are evaluated, **Then** only Space A members may upload to Space A's
   shared storage and Space B members may not upload to Space B's.
2. **Given** a subspace whose setting differs from its parent, **When** permissions
   are evaluated, **Then** the subspace's members are governed by the subspace's
   own setting.

---

### Edge Cases

- **Setting toggled off after content was uploaded**: Files already relocated onto
  existing callouts are unaffected; only the *future* ability to upload to the
  Space's shared storage is removed on the next permission refresh.
- **Inherited membership**: Where a Space's configuration treats parent-space
  members as members for the purpose of creating callouts, those same actors must
  receive the corresponding upload ability, so the create-callout and upload
  permissions stay consistent.
- **Non-member, non-admin actors**: Anyone who is not permitted to create callouts
  must not gain the upload ability through this feature.
- **Permanent vs. staged uploads**: The ability applies to uploads to the Space's
  shared storage location regardless of whether the file is being staged
  temporarily during creation or stored there directly; the two cases are not
  distinguished for the purpose of this permission.
- **Existing spaces**: The ability becomes effective only after a Space's
  permissions are recomputed; spaces created or refreshed after the change pick it
  up automatically.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a Space's settings allow its members to create callouts, those
  members MUST be able to upload files to the Space's shared storage location used
  for new callout content.
- **FR-002**: The upload ability MUST cover both files staged temporarily during
  callout creation and files stored directly in the Space's shared storage
  location; the permission MUST NOT depend on whether the upload is marked
  temporary.
- **FR-003**: When a Space's settings do **not** allow members to create callouts,
  members MUST NOT gain any ability to upload to the Space's shared storage
  location as a result of this feature.
- **FR-004**: The upload ability MUST be granted to the same set of actors who are
  permitted to create callouts in that Space (including parent-space members where
  the Space's configuration extends membership rights to them).
- **FR-005**: The upload ability MUST be scoped per Space: enabling the setting in
  one Space MUST NOT grant upload ability in any other Space, and each subspace MUST
  be governed by its own setting.
- **FR-006**: Actors who already could upload to the Space's shared storage
  location (for example, Space administrators) MUST retain that ability unchanged.
- **FR-007**: The existing behavior that relocates staged callout content onto the
  newly created callout MUST continue to work for member-created callouts, so no
  uploaded file is left orphaned or inaccessible.
- **FR-008**: The granted ability MUST take effect through the platform's standard
  permission recomputation, without requiring manual, per-file or per-callout
  permission changes.

### Key Entities *(include if feature involves data)*

- **Space**: A collaboration space that carries a setting controlling whether its
  members may create callouts. Each Space owns a shared storage location used to
  hold new callout content before a callout has storage of its own.
- **Space Member**: An actor holding the member role in a Space. Subject to the
  Space's settings, members may create callouts and, with this feature, upload the
  files those callouts contain.
- **Callout**: A unit of collaboration content created within a Space. During
  creation its embedded files are staged in the Space's shared storage location and
  then relocated to the callout once it exists.
- **Shared Space Storage Location**: The Space-level storage used as the temporary
  home for callout content during creation; write access to it is the permission
  this feature adjusts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In Spaces configured to allow members to create callouts, 100% of
  members can create a callout containing an uploaded image without encountering a
  permission error.
- **SC-002**: In Spaces where the setting is disabled, members remain unable to
  create callouts or upload to the Space's shared storage location — zero
  unintended privilege escalation.
- **SC-003**: No regression for administrators, leads, or other actors who could
  already create callouts and upload content; their success rate is unchanged.
- **SC-004**: The change requires no manual, per-space remediation beyond the
  platform's normal permission refresh for the ability to take effect.
- **SC-005**: Enabling the setting in one Space produces no change in upload ability
  for members of any other Space (verified across at least one unrelated Space and
  one parent/subspace pair).

## Assumptions

- The "members may create callouts" Space setting already exists and is the single
  switch that governs whether members may create callouts.
- New callout content (such as description images) is, by existing design, uploaded
  to the Space's shared storage location before the callout exists and is then
  relocated onto the callout once created.
- Members who are permitted to create callouts already have the create-callout
  ability; this feature only adds the corresponding file-upload ability so the flow
  can complete.
- Permissions are recomputed by the platform's existing authorization refresh
  mechanism; the new ability becomes effective for a Space when that Space's
  permissions are next recomputed.
- The set of actors permitted to create callouts (members, plus parent-space
  members where membership rights are inherited) is already determinable from the
  Space's configuration and is the correct set to receive the upload ability.
- This feature concerns authorization only; it does not change how files are stored,
  scanned, or relocated.

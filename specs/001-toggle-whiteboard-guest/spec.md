# Feature Specification: Whiteboard Guest Access Toggle

**Feature Branch**: `001-toggle-whiteboard-guest`
**Created**: 2025-11-17
**Status**: Draft
**Input**: User description: "I want the server to support guest access toggling for whiteboards, following these rules: I want only whiteboard creators or space admins (with PUBLIC_SHARE privilege) to be able to enable or disable guest access, and only if the space’s allowGuestContribution setting is True. I want that, when guest access is toggled ON, the server adds GLOBAL_GUEST permissions (READ, WRITE, CONTRIBUTE) for that whiteboard and sets the guestContributionsAllowed field to True, returning a public URL in the response. I want that, when guest access is toggled OFF, the server immediately removes GLOBAL_GUEST permissions for that whiteboard, sets guestContributionsAllowed to False, and invalidates the public URL so it returns a 404. I want any attempt to toggle guest access to fail if the user is not authorized or if the allowGuestContribution setting is False, with a clear error sent to the client. I want the guestContributionsAllowed field for every whiteboard to accurately reflect the presence of GLOBAL_GUEST permissions, dynamically updated with every change. I want the API to provide a mutation endpoint that accepts whiteboard ID and new guest access state, performs all authorization and business logic, and returns updated access, guestContributionsAllowed. This guestContributionsAllowed is part of the whiteboard data, and travels with it on all whiteboard requests."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enable Guest Access (Priority: P1)

A whiteboard creator wants to enable guest collaboration so external participants can contribute without accounts.

**Why this priority**: Unlocks immediate collaboration value by allowing invited guests to engage with the whiteboard content.

**Independent Test**: Trigger the enable action for a whiteboard meeting all prerequisites and confirm guest access is granted, the share payload enabling a public link is returned, and field states update without additional work.

**Acceptance Scenarios**:

1. **Given** a whiteboard whose space allows guest contribution and the creator is authenticated (the user doing the action has PUBLIC_SHARE privilege for this whiteboard), **When** they request guest access ON, **Then** the response confirms success, sets up privileges for credential GLOBAL_GUEST, and reflects `guestContributionsAllowed = true` (this is a computed field based on the GLOBAL_GUEST credential having these privileges for this whiteboard).

---

### User Story 2 - Disable Guest Access (Priority: P2)

A space admin with PUBLIC_SHARE privilege wants to revoke guest access once collaboration is complete.

**Why this priority**: Protects space content by ensuring links can be revoked instantly, restoring private control.

**Independent Test**: Execute the disable action and verify any client-rendered link stops working, permissions are removed, and the whiteboard state reflects the change.

**Acceptance Scenarios**:

1. **Given** a whiteboard with guest access enabled, **When** an authorized admin (the user doing the action has PUBLIC_SHARE privilege for this whiteboard) toggles guest access OFF, **Then** guest permissions are removed, the GLOBAL_GUEST credential is cleared from privileges for this whiteboard, and the response reports `guestContributionsAllowed = false` (this is a computed field based on the GLOBAL_GUEST credential having these privileges for this whiteboard).

---

### User Story 3 - Prevent Unauthorized Toggle (Priority: P3)

An editor without required privileges attempts to change guest access but must be blocked with a clear reason.

**Why this priority**: Maintains governance by preventing accidental or malicious exposure of whiteboards.

**Independent Test**: Attempt the mutation as an unauthorized user or within a space that disallows guest contribution and verify the action fails with no state change.

**Acceptance Scenarios**:

1. **Given** a user lacking creator status or PUBLIC_SHARE privilege, **When** they request guest access ON or OFF, **Then** the server rejects the request with an authorization error and the whiteboard state is unchanged.
2. **Given** a space where `allowGuestContribution` is false, **When** any user attempts to enable guest access, **Then** the server rejects the request, citing the space setting, and guest access remains disabled.

---

### Edge Cases

- Guest access is requested ON when already enabled: system should return success without duplicating permissions or altering the existing guest access payload.
- Toggle requests arrive concurrently (e.g., one enable and one disable): the system must enforce ordering so the final state matches the last accepted command and no orphaned client-generated links exist.
- A space admin flips `allowGuestContribution` to false while guest access is active: guest permissions must be removed and the whiteboard reflects `guestContributionsAllowed = false` without requiring a separate toggle action.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Only the whiteboard creator or a space admin holding the PUBLIC_SHARE privilege may toggle guest access, and only when the parent space reports `allowGuestContribution = true`.
- **FR-002**: When guest access is enabled, the system must grant the GLOBAL_GUEST role read, write, and contribute capabilities for the targeted whiteboard and persist `guestContributionsAllowed = true`.
- **FR-003**: When guest access is disabled, the system must revoke any GLOBAL_GUEST permissions tied to the whiteboard, mark `guestContributionsAllowed = false`, and ensure no active guest tokens or derived links remain.
- **FR-004**: The API must expose a mutation accepting whiteboard identifier and desired guest access state, executing authorization, enforcing business rules, and returning the updated access configuration and `guestContributionsAllowed` flag.
- **FR-005**: The mutation response must include a guest access payload (e.g., share token or identifier) only when guest access remains enabled so that clients can render the public link; otherwise the payload is omitted or null to prevent reuse.
- **FR-006**: Every attempt to toggle guest access while unauthorized or while `allowGuestContribution = false` must fail with a descriptive error message and without changing permissions or flags.
- **FR-007**: The `guestContributionsAllowed` value returned with any whiteboard data must always mirror the actual presence or absence of GLOBAL_GUEST permissions for that whiteboard.
- **FR-008**: Guest access tokens must be invalidated immediately upon disablement so that any client-generated public link using those tokens responds with a not-found outcome.

### Key Entities _(include if feature involves data)_

- **Whiteboard**: Collaboration surface within a space; key attributes for this feature include `id`, `guestContributionsAllowed`, collection of access grants, and any associated guest access payload metadata.
- **Space**: Container governing whiteboards and permissions; relevant attributes include `id`, `allowGuestContribution`, admin roster, and privilege assignments such as PUBLIC_SHARE.
- **Global Guest Access Link**: Client-rendered URL tied to GLOBAL_GUEST permissions that enables unauthenticated access; server-managed attributes include share token, target whiteboard reference, and active/inactive status.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of authorized toggle requests complete within a single mutation response and reflect the requested guest access state with no manual follow-up actions required.
- **SC-002**: 100% of unauthorized or disallowed toggle attempts return a clear rejection message and result in zero changes to guest permissions or `guestContributionsAllowed` values.
- **SC-003**: Post-deployment audit must report 0 mismatches between `guestContributionsAllowed` values and actual GLOBAL_GUEST permission assignments across all whiteboards.
- **SC-004**: Former client-generated public links respond with a not-found outcome within 5 seconds of guest access being disabled, ensuring revoked access cannot be reused.

## Assumptions

- Clients assemble public URLs using the share token or identifier supplied by the server; server logic focuses on token issuance and validation without constructing the final URL string.
- Error messages follow current API patterns (structured code plus human-readable message) and can be localized as needed.
- Enabling guest access while already active should be treated as idempotent, maintaining the current link and permissions without duplication.

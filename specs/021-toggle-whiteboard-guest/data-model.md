# Data Model: Whiteboard Guest Access Toggle

## Whiteboard

- **Identifiers**: `id` (UUID), `spaceId`
- **Key Fields**:
  - `guestContributionsAllowed` (boolean, derived at read time from permissions)
  - `accessGrants` (collection of credential assignments scoped per whiteboard)
  - `publicShareState` (enum: `DISABLED`, `ENABLED`) — internal helper for application layer to express desired toggle during commands
- **Relationships**:
  - Belongs to **Space** (`spaceId` foreign key)
  - Linked to **CredentialAssignment** entries referencing `GLOBAL_GUEST`
- **Lifecycle**:
  - `DISABLED` → `ENABLED`: occurs via toggle command when authorization + space configuration succeed
  - `ENABLED` → `DISABLED`: occurs when toggle command revokes `GLOBAL_GUEST`

## Space

- **Identifiers**: `id`
- **Key Fields**:
  - `allowGuestContribution` (boolean)
  - `licenseCapabilities` (set)
- **Relationships**:
  - Aggregates **Whiteboard** entities
  - Maintains **RoleAssignments** for members, including PUBLIC_SHARE privilege
- **Lifecycle Constraints**:
  - When `allowGuestContribution` transitions to `false`, any associated whiteboard must revoke guest access

## CredentialAssignment

- **Identifiers**: composite (`whiteboardId`, `credentialId`)
- **Key Fields**:
  - `credentialId` (`GLOBAL_GUEST` for this feature)
  - `permissions` (bitset covering READ/WRITE/CONTRIBUTE)
- **Relationships**:
  - References **Whiteboard** and **Credential** (GLOBAL_GUEST)
- **Lifecycle**:
  - Created when guest access toggled ON
  - Deleted when toggled OFF or space revokes guest access globally

## Authorization Context

- **Inputs**:
  - Requesting user identity (space member attempting the toggle)
  - Privilege set (must include PUBLIC_SHARE for the whiteboard/space)
- **Derived Flags**:
  - `canToggleGuestAccess` — computed from PUBLIC_SHARE privilege AND `allowGuestContribution`

## Derived/Computed Views

- `guestContributionsAllowed` is recalculated for all read models by checking whether a `CredentialAssignment` exists for `GLOBAL_GUEST` with WRITE + CONTRIBUTE permissions.
- Guest routes rely on deterministic URL pattern: `/guest/whiteboards/{whiteboardId}`; availability is controlled via authorization middleware checking `GLOBAL_GUEST` assignment.

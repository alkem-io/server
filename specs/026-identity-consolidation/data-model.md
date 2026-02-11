# Data Model: Identity & Authentication Consolidation

**Feature**: `026-identity-consolidation`
**Consolidates**: `014`, `016`, `017`, `018`

## Entities

### User (Modified)

- **Table**: `user`
- **New Field**: `authenticationID: uuid | null`
  - Unique across all users when non-null.
  - Represents the Ory Kratos identity UUID.
  - **Constraint**: `UQ_0742ec75e9fc10a1e393a3ef4c7` (UNIQUE).
  - **Index**: `IDX_0742ec75e9fc10a1e393a3ef4c`.
- **Removed Fields**:
  - `accountUpn` (varchar(128)): Column and unique constraint `UQ_c09b537a5d76200c622a0fd0b70` dropped.
  - `communicationID` (varchar): Dropped.
- **Relationships**:
  - `agent` (OneToOne) – Unchanged.
  - `profile` (OneToOne) – Unchanged.

### Virtual Contributor (Modified)

- **Table**: `virtual_contributor`
- **Removed Field**: `communicationID` (varchar): Dropped.

### Organization (Modified)

- **Table**: `organization`
- **Removed Field**: `communicationID` (varchar): Dropped.

### Room (Modified)

- **Table**: `room`
- **Removed Field**: `externalRoomID` (varchar): Dropped.

### Identity Resolution (Conceptual)

- **Internal API**: `/rest/internal/identity/resolve`
- **Input**: `authenticationId` (Kratos UUID)
- **Output**: `{ userId: string, agentId: string }`
- **Behavior**:
  - Resolves Kratos UUID to Alkemio User ID.
  - Resolves associated Agent ID.
  - Returns 404 `NO_AGENT_FOR_USER` if user exists but has no agent.
  - JIT provisions user if Kratos UUID is valid but unknown to Alkemio.

## Database Schema Changes

### Migration: `UserIdentityCleanup1764590889000`

1.  **Add Column**: `user.authenticationID` (uuid, NULLABLE).
2.  **Add Constraint**: `UQ_0742ec75e9fc10a1e393a3ef4c7` UNIQUE on `user.authenticationID`.
3.  **Add Index**: `IDX_0742ec75e9fc10a1e393a3ef4c` on `user.authenticationID`.
4.  **Drop Constraint**: `UQ_c09b537a5d76200c622a0fd0b70` (accountUpn).
5.  **Drop Column**: `user.accountUpn`.
6.  **Drop Column**: `user.communicationID`.
7.  **Drop Column**: `virtual_contributor.communicationID`.
8.  **Drop Column**: `organization.communicationID`.
9.  **Drop Column**: `room.externalRoomID`.

## Logging & Audit

- **LogContext.AUTH**:
  - Backfill mutation progress.
  - Identity resolution attempts (caller IP, outcome).
  - JIT provisioning events.

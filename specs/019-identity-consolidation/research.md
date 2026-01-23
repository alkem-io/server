# Research: Identity & Authentication Consolidation

**Feature**: `019-identity-consolidation`
**Consolidates**: `014`, `016`, `017`, `018`

## Decisions

### 1. Kratos Identity Linking

- **Decision**: Add `authenticationID` as nullable unique column.
- **Rationale**: Allows legacy users to exist without Kratos links while enforcing uniqueness for linked users.
- **Backfill**: Implemented via batched admin mutation to avoid long-running transactions.

### 2. Drop `accountUpn`

- **Decision**: Full removal from live schema and code.
- **Rationale**: Field is unused and deprecated. Backups/historical exports are out of scope.
- **Replacement**: Use `accountID` or `authenticationID` for stable identification.

### 3. Session Sync Removal

- **Decision**: Delete entire module without replacement.
- **Rationale**: Kratos handles its own session lifecycle. Synapse session cleanup can be manual. No other components depend on this module.

### 4. Identity Resolution Behavior

- **Decision**: Return `{ userId, agentId }` or 404 `NO_AGENT_FOR_USER`.
- **Rationale**: Internal consumers (Matrix Adapter) need the Agent ID to perform actions. Returning partial data (just userId) would lead to runtime errors downstream.
- **Auth**: Zero request-level auth (network restricted) but strict validation and audit logging.

### 5. JIT Provisioning

- **Decision**: `/rest/internal/identity/resolve` will create users if they don't exist.
- **Rationale**: Supports seamless onboarding for new users entering via external systems (e.g., Matrix) without requiring a separate registration step.

# Research Notes: Whiteboard Guest Access Toggle

**Date**: 2025-11-17
**Branch**: 021-toggle-whiteboard-guest

## Decision 1: Permission-Only Guest Exposure

- **Decision**: Guest access will be controlled solely through `GLOBAL_GUEST` permission flags; the server will not mint share tokens or URLs.
- **Rationale**: Aligns with product ask and keeps logic consistent with existing permission evaluation. Eliminates token lifecycle management and simplifies revocation.
- **Alternatives Considered**:
  - Maintain legacy token issuance flow → Rejected because clients already compose share links and double sources of truth increase revocation risk.
  - Introduce short-lived signed links → Rejected as scope creep; would require new infrastructure and UX alignment.

## Decision 2: Mutation Contract (`updateWhiteboardGuestAccess`)

- **Decision**: Implement a single GraphQL mutation accepting whiteboard ID and desired guest state, returning the updated whiteboard access payload including `guestContributionsAllowed`.
- **Rationale**: Matches constitution guidance for stable GraphQL contracts and avoids proliferating separate enable/disable mutations.
- **Alternatives Considered**:
  - Separate `enableGuestAccess` / `disableGuestAccess` mutations → Rejected to prevent duplicated authorization logic and encourage idempotent toggles.
  - Reuse an existing generic access mutation → Rejected; existing surfaces do not enforce the guest-specific business rules needed here.

## Decision 3: Domain-Oriented Toggle Service

- **Decision**: Extend domain services under `src/domain/common/whiteboard` to encapsulate guest toggle rules and reuse from both general and platform-admin flows.
- **Rationale**: Preserves principle 1 (domain-centric design) and ensures space configuration and role checks live alongside whiteboard invariants.
- **Alternatives Considered**:
  - Implement logic directly in GraphQL resolver → Rejected per constitution; would duplicate business rules and complicate testing.
  - Handle toggling exclusively in platform-admin module → Rejected because guest access must remain available to standard members granted PUBLIC_SHARE privilege.

## Decision 4: Observability Hooks

- **Decision**: Emit structured debug logs capturing requester identity, whiteboard ID, requested state, and outcome; reuse existing audit/metrics flows without new dashboards.
- **Rationale**: Provides traceability when guest access is changed, satisfies principle 5 without inventing unused metrics.
- **Alternatives Considered**:
  - Add new metrics/timers → Rejected; no consumption path defined and would violate observability guidance.
  - Rely solely on existing logs → Considered, but explicit entries improve troubleshooting for this feature.

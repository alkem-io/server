# Research: Upgrade Matrix Adapter to 0.7.0 & Use ActorID

**Feature**: `019-matrix-adapter-upgrade`
**Date**: 2025-11-26

## Decisions

### 1. Library Upgrade
- **Decision**: Upgrade `@alkemio/matrix-adapter-lib` from `^0.6.2` to `0.7.0`.
- **Rationale**: Required to access the new `ActorID` based interface and reduce technical debt.
- **Alternatives**: None, this is a mandatory upgrade.

### 2. Data Model Changes
- **Decision**: Remove `communicationID` column from `User`, `VirtualContributor`, and `Organization` tables.
- **Rationale**: The field is obsolete as `AgentID` (ActorID) replaces it. `AgentID` is already present on `ContributorBase` (via `Agent` relation) or directly accessible.
- **Migration Strategy**: Drop the columns. No data migration needed as the ID is obsolete and replaced by a different existing ID.

### 3. Code Refactoring
- **Decision**: Remove `communicationID` property from `User`, `VirtualContributor`, `Organization`, and `AgentInfo` classes/interfaces.
- **Rationale**: To align with the data model and prevent usage of the obsolete ID.
- **Impact**:
    - `AgentInfo` (in `src/core/authentication.agent.info/agent.info.ts`) needs update.
    - `ContributorBase` (in `src/domain/community/contributor/contributor.base.entity.ts`) likely holds the `communicationID` for `User`, `VC`, `Org`.
    - `CommunicationAdapter` needs to be updated to use `AgentID` for all calls to `matrix-adapter-lib`.
    - Event handlers consuming matrix events need to be updated to expect `ActorID` (AgentID).

### 4. GraphQL Impact
- **Decision**: No changes to GraphQL schema detected.
- **Rationale**: `grep` search for `communicationID` in `src/**/*.graphql` and `src/**/*.resolver.ts` returned no results. This suggests `communicationID` was internal and not exposed via the API.
- **Verification**: Double check `ContributorBase` or DTOs used in resolvers to ensure no implicit exposure.

### 5. Unrelated `communicationID` Preservation
- **Decision**: Preserve `communicationID` in `RoomDetails` DTOs and other unrelated areas.
- **Rationale**: `grep` showed usage in `room.details.dto.ts` and `identity.resolver.service.ts`. The latter seems to query by `communicationID`, which will break.
- **Action**: `IdentityResolverService` queries need to be updated or removed if they rely on the obsolete field. If `IdentityResolverService` is used to resolve users by `communicationID` (e.g. from incoming matrix events), it must be updated to resolve by `AgentID` instead.

## Open Questions / Risks

- **Identity Resolver**: `src/services/infrastructure/entity-resolver/identity.resolver.service.ts` uses `communicationID`. This service likely needs significant refactoring to support `AgentID` resolution or be deprecated if no longer needed (since events now bring `AgentID` directly).
- **Risk**: If external systems still send `communicationID`, we might have an issue. But the spec says "events from matrix-adapter now return ActorIDs", so we should be safe assuming the adapter is the only source.


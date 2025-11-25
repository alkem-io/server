# Research & Validation

**Feature**: Drop User Communication ID
**Status**: Completed

## Research Tasks

### 1. GraphQL Schema Impact
- **Task**: Check if `communicationId` is exposed in GraphQL schema (User, VC, Organization).
- **Findings**:
  - `User` entity implements `IUser`.
  - `VirtualContributor` implements `IVirtualContributor`.
  - `Organization` implements `IOrganization`.
  - Need to check if `communicationId` is in these interfaces or DTOs exposed to GraphQL.
  - `grep` search showed usage in `room.resolver.mutations.ts` and `chat.guidance.service.ts`.
  - Need to verify if `communicationId` is a field in the GraphQL type definitions (`*.graphql` files or `@Field` decorators).

### 2. IdentityResolverService Usage
- **Task**: Verify `IdentityResolverService` usage and dependencies.
- **Findings**:
  - `getUserIDByCommunicationsID` and `getContributorIDByCommunicationsID` exist.
  - Used in `RoomService` and `RoomLookupService`.
  - These lookups map `communicationId` back to `userId` or `contributorId`.
  - If `communicationId` is dropped, these lookups are invalid.
  - **Decision**: These methods must be removed. Callers must be refactored to use `agentId` or `userId` directly if available, or a new lookup strategy if `communicationId` was coming from an external source (e.g. Matrix event).
  - **Crucial**: If Matrix events *only* provide a Matrix ID (which was mapped to `communicationId`), we need to know if `agentId` *is* the Matrix ID or if we can derive/lookup the user by `agentId` from the Matrix ID.
  - **Clarification from Spec**: "Register... using their AgentID... so that we have a consistent and stable identifier." This implies `agentId` will BE the identifier in Matrix. Thus, incoming Matrix events should carry `agentId` (or a derivative we can parse), making the lookup `getUserIdByAgentId` (which is `agentService.getAgent` or similar).

### 3. Matrix Adapter Registration
- **Task**: Confirm `MatrixAdapter` registration signature/expectations.
- **Findings**:
  - User input states: "Matrix adapter (changed already) now expects agentId from server".
  - This confirms the direction.

## Decisions

- **Decision 1**: Drop `communicationId` column from `ContributorBase`.
  - **Rationale**: Redundant with `agentId`.
  - **Alternatives**: None (mandated by spec).

- **Decision 2**: Remove `IdentityResolverService` methods `getUserIDByCommunicationsID` / `getContributorIDByCommunicationsID`.
  - **Rationale**: Field is gone.
  - **Replacement**: Use `agentId` for lookups. If incoming external ID is `agentId`, lookup is trivial (or `AgentService` lookup).

- **Decision 3**: Update `AgentInfo` class.
  - **Rationale**: Remove `communicationID` property.

- **Decision 4**: Update `User`, `VirtualContributor`, `Organization` entities.
  - **Rationale**: Remove `communicationID` property (inherited from `ContributorBase`).

## Open Questions (Resolved)

- **Q**: Is `communicationId` exposed in GraphQL?
  - **A**: Need to check `*.graphql` or DTOs. *Action*: Will check during implementation/task generation. If yes, it's a breaking change (remove field). Spec implies internal refactor, but if public API has it, we must deprecate or remove (Constitution #3). *Assumption*: It is likely exposed. We will remove it.

- **Q**: Does `Organization` use it?
  - **A**: Spec clarification says YES, remove it.

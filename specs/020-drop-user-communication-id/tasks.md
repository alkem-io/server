# Tasks: Drop User Communication ID

**Branch**: `020-drop-user-communication-id` | **Spec**: [spec.md](./spec.md)
**Status**: Completed

## User Story 1: Communication Registration using AgentID (P1)

- [x] **Task 1.1**: Update `ContributorBase` entity to remove `communicationID` column. <!-- id: 0 -->
- [x] **Task 1.2**: Update `User`, `VirtualContributor`, and `Organization` entities to reflect removal of `communicationID`. <!-- id: 1 -->
- [x] **Task 1.3**: Generate database migration to drop `communicationId` column from `contributor_base` table. <!-- id: 2 -->
- [x] **Task 1.4**: Update `AgentInfo` class to remove `communicationID` field. <!-- id: 3 -->
- [x] **Task 1.5**: Update `MatrixAdapter` (or communication adapter) registration calls in `User` and `VirtualContributor` creation flows to use `agentId` instead of `communicationId`. <!-- id: 4 -->
- [x] **Task 1.6**: Verify new User/VC registration with Matrix uses `agentId` (Integration Test). <!-- id: 5 -->

## User Story 2: Communication Flows using AgentID (P1)

- [x] **Task 2.1**: Replace `getUserIDByCommunicationsID` and `getContributorIDByCommunicationsID` with `getUserIDByAgentID` and `getVirtualContributorIDByAgentID` in `IdentityResolverService`. <!-- id: 6 -->
- [x] **Task 2.2**: Refactor `RoomService` and `RoomLookupService` to use `agentId` instead of `communicationId` for user lookups. <!-- id: 7 -->
- [x] **Task 2.3**: Update `chat.guidance.service.ts` and `room.resolver.mutations.ts` to remove `communicationId` usage. <!-- id: 8 -->
- [x] **Task 2.4**: Check and remove `communicationId` from GraphQL schema (DTOs/Interfaces) if exposed. (BREAKING CHANGE APPROVED: No deprecation period). <!-- id: 9 -->
- [x] **Task 2.5**: Run `pnpm run schema:diff` and validate breaking changes (if any). <!-- id: 10 -->
- [x] **Task 2.6**: Verify existing communication flows (messaging, joining) work with `agentId` (Regression Test). <!-- id: 11 -->

## Cleanup & Verification

- [x] **Task 3.1**: Run full test suite (`pnpm test:ci`) to ensure no regressions. <!-- id: 12 -->
- [x] **Task 3.2**: Verify database migration runs successfully (`pnpm run migration:run`). <!-- id: 13 -->
- [x] **Task 3.3**: Update documentation (if any) referencing `communicationId` for Users/VCs. <!-- id: 14 -->

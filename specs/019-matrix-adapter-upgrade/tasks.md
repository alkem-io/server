# Tasks: Upgrade Matrix Adapter to 0.7.0 & Use ActorID

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Checklist**: [checklist.md](checklist.md)

## Phase 1: Library Upgrade & Code Refactoring

- [x] Upgrade `@alkemio/matrix-adapter-lib` to `0.7.0` in `package.json` <!-- id: 0 -->
- [x] Remove `communicationID` from `ContributorBase` entity <!-- id: 1 -->
- [x] Remove `communicationID` from `AgentInfo` class <!-- id: 2 -->
- [x] Update `CommunicationAdapter` to use `AgentID` instead of `communicationID` <!-- id: 3 -->
- [x] Update `IdentityResolverService` to handle `AgentID` logic <!-- id: 4 -->
- [x] Fix compilation errors <!-- id: 5 -->

## Phase 2: Database Migration

- [x] Generate migration to drop `communicationID` columns from `user`, `virtual_contributor`, `organization` <!-- id: 6 -->
- [x] Verify migration runs successfully <!-- id: 7 -->

## Phase 3: Verification

- [x] Run `pnpm test:ci` to ensure no regressions <!-- id: 8 -->
- [x] Manual verification of communication flows (if applicable) <!-- id: 9 -->

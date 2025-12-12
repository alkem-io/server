# Tasks: Identity Consolidation

**Spec**: [specs/019-identity-consolidation/spec.md](specs/019-identity-consolidation/spec.md)
**Plan**: [specs/019-identity-consolidation/plan.md](specs/019-identity-consolidation/plan.md)

## Phase 1: Schema & Data Model Changes
**Goal**: Finalize the user identity schema by adding Kratos linking and removing legacy fields.

- [x] T001 [014/016/017] Create consolidated migration `userIdentityCleanup`
  - Adds `authenticationID` column to `User`
  - Drops `accountUpn` column from `User`
  - Removes `session_sync` tables (if any)
- [x] T002 [014] Update `User` entity definition (add `authenticationID`, remove `accountUpn`)

## Phase 2: Identity Resolution & Linking Logic
**Goal**: Implement the core logic for resolving and linking Kratos identities to Alkemio users.

- [x] T003 [014] Create `UserAuthenticationLinkModule` and Service
- [x] T004 [014] Implement `linkOrCreateUser` logic in `UserAuthenticationLinkService`
- [x] T005 [014] Update `UserService` to use `UserAuthenticationLinkService`
- [x] T006 [014] Implement `AuthenticationIdBackfillService` for existing users
- [x] T007 [014] Implement `adminUserAccountDelete` cleanup (nullify `authenticationID`)
- [x] T008 [018] Update identity resolution logic to resolve `agentId` alongside `userId`
- [x] T009 [018] Handle "missing agent" scenarios in resolution logic

## Phase 3: Internal API (Identity Resolve)
**Goal**: Expose identity resolution to internal services (e.g., Matrix Adapter).

- [x] T011 [014/018] Create `/rest/internal/identity/resolve` endpoint returning `{ userId, agentId }`
- [x] T012 [018] Ensure consistent error responses for unlinked/missing agents

## Phase 4: Cleanup & Legacy Removal
**Goal**: Remove obsolete services and configuration.

- [x] T013 [017] Delete `src/services/session-sync` module entirely
- [x] T014 [017] Remove `SessionSyncModule` from `AppModule`
- [x] T015 [017] Remove `SESSION_SYNC_*` environment variables and config
- [x] T016 [016] Remove all code references to `accountUpn`
- [x] T017 [016] Update tests to reflect removal of `accountUpn` and Session Sync

## Phase 5: Verification
**Goal**: Ensure the consolidated identity system works as expected.

- [x] T018 Verify `authenticationID` persistence on new user registration
- [x] T019 Verify `/rest/internal/identity/resolve` returns correct `agentId`
- [x] T020 Verify `accountUpn` is gone from schema and codebase
- [x] T021 Verify Session Sync scheduler is no longer running

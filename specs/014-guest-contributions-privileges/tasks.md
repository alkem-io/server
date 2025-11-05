# Tasks: Guest Contributions Privilege Management

**Feature**: 014-guest-contributions-privileges
**Input**: Design documents from `/specs/014-guest-contributions-privileges/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/service-contracts.md

**Tests**: Not included - tests are optional and not requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add new PUBLIC_SHARE privilege enum value that all user stories depend on

**Note**: No database migration required - AuthorizationPrivilege is a TypeScript compile-time enum only

- [x] T001 Add PUBLIC_SHARE enum value to AuthorizationPrivilege in src/common/enums/authorization.privilege.ts
- [x] T002 Validate enum addition compiles and builds successfully (run `pnpm build`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service extensions that MUST be complete before ANY user story can be implemented

**Architecture Note**: This feature uses the **authorization reset pattern** - privileges are NOT explicitly granted/revoked but rather assigned statically during `applyAuthorizationPolicy()` cascade. When space settings change, the entire space tree's authorization is rebuilt from scratch.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add getAdmins() method to CommunityService in src/domain/community/community/community.service.ts
- [x] T004 [P] Add Winston logger configuration for privilege operations in GuestContributionPrivilegeHandler module
- [x] T005 [P] Add Elastic APM span instrumentation for privilege operations in GuestContributionPrivilegeHandler module

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automatic privilege granting when guest contributions enabled (Priority: P1) 🎯 MVP

**Goal**: When a space admin enables allowGuestContributions, all space admins automatically receive PUBLIC_SHARE privilege on all whiteboards in that space, and each whiteboard owner receives PUBLIC_SHARE on their own whiteboard.

**Architecture**: Privileges are assigned during `applyAuthorizationPolicy()` cascade triggered by space settings change. Space settings are passed down through Collaboration → CalloutsSet → Callout → CalloutContribution → Whiteboard authorization services.

**Independent Test**: Enable allowGuestContributions on a space with existing whiteboards and verify that all space admins immediately gain PUBLIC_SHARE privilege on all whiteboards in that space, and each whiteboard owner gains PUBLIC_SHARE on their own whiteboard. Create a new whiteboard and verify the creator automatically receives PUBLIC_SHARE.

### Implementation for User Story 1

**Core Change**: Extend `WhiteboardAuthorizationService.appendPrivilegeRules()` to conditionally append PUBLIC_SHARE privilege rules when `spaceSettings.collaboration.allowGuestContributions === true`

- [x] T006 [P] [US1] Add space settings parameter propagation through CalloutContribution authorization in src/domain/collaboration/callout-contribution/callout.contribution.service.authorization.ts
- [x] T007 [US1] Extend appendCredentialRules() in WhiteboardAuthorizationService to add owner PUBLIC_SHARE credential rule in src/domain/common/whiteboard/whiteboard.service.authorization.ts
- [x] T008 [US1] Extend appendPrivilegeRules() in WhiteboardAuthorizationService to conditionally add admin PUBLIC_SHARE privilege rule based on space settings in src/domain/common/whiteboard/whiteboard.service.authorization.ts
- [x] T009 [US1] Update applyAuthorizationPolicy() signature in WhiteboardAuthorizationService to accept space settings parameter in src/domain/common/whiteboard/whiteboard.service.authorization.ts
- [x] T010 [US1] Verify SpaceService.shouldUpdateAuthorizationPolicy() detects allowGuestContributions changes in src/domain/space/space/space.service.ts
- [x] T011 [US1] Add structured logging for PUBLIC_SHARE privilege assignment in appendPrivilegeRules() in src/domain/common/whiteboard/whiteboard.service.authorization.ts
- [x] T012 [US1] Add metrics emission for privilege rule creation count in src/domain/common/whiteboard/whiteboard.service.authorization.ts
- [x] T013 [US1] Add audit trail logging for space settings trigger in SpaceResolverMutations.updateSpaceSettings() in src/domain/space/space/space.resolver.mutations.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - enabling allowGuestContributions triggers authorization reset which grants privileges to admins and owners

---

## Phase 4: User Story 2 - Automatic privilege revocation when guest contributions disabled (Priority: P1)

**Goal**: When a space admin disables allowGuestContributions, the system automatically revokes PUBLIC_SHARE privileges from all whiteboards in that space.

**Architecture**: When `allowGuestContributions` changes from true to false, `shouldUpdateAuthorizationPolicy()` returns true, triggering `applyAuthorizationPolicy()` cascade. During cascade, `appendPrivilegeRules()` checks the setting and does NOT append PUBLIC_SHARE rules, effectively revoking them during the reset.

**Independent Test**: Disable allowGuestContributions on a space where users have PUBLIC_SHARE privileges and verify that all PUBLIC_SHARE privileges are immediately revoked from all whiteboards in that space.

### Implementation for User Story 2

**Core Change**: Extend conditional logic in `WhiteboardAuthorizationService.appendPrivilegeRules()` to NOT append PUBLIC_SHARE rules when `spaceSettings.collaboration.allowGuestContributions === false`

- [x] T014 [US2] Add conditional branch in appendPrivilegeRules() to skip PUBLIC_SHARE rules when allowGuestContributions is false in src/domain/common/whiteboard/whiteboard.service.authorization.ts
- [x] T015 [US2] Add structured logging for privilege revocation (skipped rule creation) in src/domain/common/whiteboard/whiteboard.service.authorization.ts
- [x] T016 [US2] Add metrics emission for revocation operations (authorization reset count) in src/domain/common/whiteboard/whiteboard.service.authorization.ts
- [x] T017 [US2] Verify shouldUpdateAuthorizationPolicy() correctly detects allowGuestContributions: true→false transition in src/domain/space/space/space.service.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - toggle works bidirectionally through authorization reset

---

## Phase 5: User Story 3 - Per-whiteboard privilege scope without inheritance (Priority: P2)

**Goal**: PUBLIC_SHARE privilege is scoped to individual whiteboards only, with no inheritance from space to subspace, ensuring fine-grained control.

**Architecture**: Each space's authorization reset is independent. When a subspace triggers `applyAuthorizationPolicy()`, it uses its own `spaceSettings`, not the parent's. This naturally prevents inheritance.

**Independent Test**: Create a space with subspaces, enable allowGuestContributions on the parent space only, and verify that whiteboards in subspaces do not receive PUBLIC_SHARE privileges unless the subspace also has allowGuestContributions enabled.

### Implementation for User Story 3

**Core Change**: Verify that space settings are NOT inherited during authorization cascade - each space uses its own settings during reset

- [ ] T018 [US3] Add validation to verify space settings isolation in SpaceAuthorizationService.propagateAuthorizationToChildEntities() in src/domain/space/space/space.service.authorization.ts
- [ ] T019 [US3] Add space-level admin filtering (exclude subspace admins) in getAdmins() implementation in src/domain/community/community/community.service.ts
- [ ] T020 [US3] Add logging for space boundary enforcement during authorization reset in src/domain/common/whiteboard/whiteboard.service.authorization.ts
- [ ] T021 [US3] Add metrics for per-space authorization reset operations in src/domain/space/space/space.service.authorization.ts

**Checkpoint**: All user stories should now correctly enforce per-whiteboard, per-space privilege scoping through independent authorization resets

---

## Phase 6: User Story 4 - New space admin privilege assignment (Priority: P3)

**Goal**: When a user is granted space admin privileges on a space that has allowGuestContributions enabled, they automatically receive PUBLIC_SHARE privilege on all whiteboards in that space.

**Architecture**: Currently, granting/removing admin role only resets **user** authorization, not **space** authorization. We need to extend `RoleSetResolverMutations` to trigger space authorization reset when admin roles change, ensuring immediate privilege updates.

**Independent Test**: Grant admin privileges to a user on a space with allowGuestContributions enabled and verify they immediately receive PUBLIC_SHARE privilege on all whiteboards in that space. Remove admin privileges and verify PUBLIC_SHARE is immediately revoked.

### Implementation for User Story 4

**Core Change**: Extend role assignment/removal mutations to trigger space authorization reset when ADMIN role changes

- [ ] T022 [US4] Add helper method to get Space from RoleSet in RoleSetService in src/domain/access/role-set/role.set.service.ts
- [ ] T023 [US4] Extend assignRoleToUser() mutation to trigger space auth reset when role is ADMIN in src/domain/access/role-set/role.set.resolver.mutations.ts
- [ ] T024 [US4] Extend removeRoleFromUser() mutation to trigger space auth reset when role is ADMIN in src/domain/access/role-set/role.set.resolver.mutations.ts
- [ ] T025 [US4] Add logging for admin role change triggering space authorization reset in src/domain/access/role-set/role.set.resolver.mutations.ts
- [ ] T026 [US4] Add metrics emission for admin role change authorization reset operations in src/domain/access/role-set/role.set.resolver.mutations.ts

**Checkpoint**: All user stories complete - admin role changes immediately trigger space authorization reset, granting/revoking PUBLIC_SHARE privileges on all whiteboards

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and finalize the feature

- [ ] T025 [P] Add PUBLIC_SHARE privilege documentation to docs/authorization-forest.md
- [ ] T026 [P] Update GraphQL schema comments if needed (though no schema changes expected)
- [ ] T027 Verify performance targets met (< 1 second for 1000 whiteboards) with manual load testing per quickstart.md
- [ ] T028 Verify observability outputs (logs, metrics, audit trail) are correct per quickstart.md scenarios
- [ ] T029 Run schema validation: pnpm run schema:diff to confirm no breaking changes
- [ ] T030 Run linting: pnpm lint to ensure code quality
- [ ] T031 Review and finalize all error handling paths for consistency
- [ ] T032 Document operational runbook for privilege troubleshooting in quickstart.md if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Extends US1's conditional logic for revocation
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Adds validation to US1/US2
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Relies on US1's authorization reset mechanism

### Within Each User Story

- US1: Space settings propagation → appendCredentialRules extension → appendPrivilegeRules extension → applyAuthorizationPolicy signature update → shouldUpdateAuthorizationPolicy verification → observability
- US2: Conditional branch in appendPrivilegeRules → logging → metrics → shouldUpdateAuthorizationPolicy verification
- US3: Settings isolation validation → admin filtering → boundary logging → metrics
- US4: Role grant verification → logging → metrics

### Parallel Opportunities

- All Setup tasks (T001, T002) can run in parallel (different operations)
- All Foundational tasks marked [P] (T003, T004, T005) can run in parallel (different files)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Within US1: T007 and T008 can run in parallel (different methods in same file)
- Within Polish phase: T025, T026 can run in parallel (different files)

---

## Parallel Example: User Story 1

```bash
# Launch credential and privilege rule extensions together:
Task T007: "Extend appendCredentialRules() in WhiteboardAuthorizationService..."
Task T008: "Extend appendPrivilegeRules() in WhiteboardAuthorizationService..."

# After both complete, proceed with authorization policy signature:
Task T009: "Update applyAuthorizationPolicy() signature..."
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (add enum, validate build)
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (privilege granting via authorization reset)
4. Complete Phase 4: User Story 2 (privilege revocation via authorization reset)
5. **STOP and VALIDATE**: Test bidirectional toggle independently
6. Deploy/demo if ready (core functionality working)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP with granting via reset!)
3. Add User Story 2 → Test independently → Deploy/Demo (MVP with revocation via reset!)
4. Add User Story 3 → Test independently → Deploy/Demo (boundary enforcement)
5. Add User Story 4 → Test independently → Deploy/Demo (new admin support via reset)
6. Complete Polish → Final production-ready release
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (privilege granting via reset)
   - Developer B: User Story 2 (privilege revocation via reset)
   - Developer C: User Story 3 (boundary validation)
   - Developer D: User Story 4 (new admin support via reset)
3. Stories complete and integrate independently

---

## Task Count Summary

- **Total Tasks**: 34 (updated from 32 after adding admin role change triggers)
- **Setup**: 2 tasks
- **Foundational**: 3 tasks (reduced from 6)
- **User Story 1**: 8 tasks (priority P1) 🎯 MVP
- **User Story 2**: 4 tasks (priority P1) 🎯 MVP
- **User Story 3**: 4 tasks (priority P2)
- **User Story 4**: 5 tasks (priority P3, updated to trigger space auth reset)
- **Polish**: 8 tasks (reduced from 9)

**Parallel Opportunities**: 4 tasks can run in parallel (marked with [P])

**MVP Scope (Recommended)**: Phase 1 + Phase 2 + Phase 3 + Phase 4 = 17 tasks (User Stories 1 and 2 provide complete bidirectional toggle functionality via authorization reset)

---

## Notes

- [P] tasks = different files or operations, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow quickstart.md for manual testing scenarios
- Run schema:diff after implementation to verify no breaking changes
- **Architecture**: Uses authorization reset pattern - privileges assigned during `applyAuthorizationPolicy()` cascade, not via explicit grant/revoke
- **No migration needed**: AuthorizationPrivilege is TypeScript compile-time enum only
- **Space settings propagation**: Settings flow through Collaboration → CalloutsSet → Callout → CalloutContribution → Whiteboard authorization services

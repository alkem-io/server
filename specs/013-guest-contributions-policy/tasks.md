---
description: 'Task list for Guest Contributions Policy implementation'
---

# Tasks: Guest Contributions Policy for Spaces

**Input**: Design documents from `/specs/013-guest-contributions-policy/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Not requested in feature specification - following existing pattern without additional tests

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure - No setup needed for this additive change

**Note**: This feature follows an existing pattern with established infrastructure already in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain model changes that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T001 [P] Add allowGuestContributions field to ISpaceSettingsCollaboration interface in src/domain/space/space.settings/space.settings.collaboration.interface.ts
- [ ] T002 [P] Add allowGuestContributions field to CreateSpaceSettingsCollaborationInput DTO in src/domain/space/space.settings/dto/space.settings.collaboration.dto.create.ts
- [ ] T003 [P] Add allowGuestContributions field to UpdateSpaceSettingsCollaborationInput DTO in src/domain/space/space.settings/dto/space.settings.collaboration.dto.update.ts
- [ ] T004 Create database migration following pattern from 1759156590119-addSettingAllowMembersToVideoCall.ts in src/migrations/

**Checkpoint**: Domain foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Space admins control guest access (Priority: P1) 🎯 MVP

**Goal**: Space admins can toggle the allowGuestContributions setting in space collaboration settings

**Independent Test**: A space admin can access space settings, toggle the guest contributions policy, and verify the setting is saved correctly

### Implementation for User Story 1

- [ ] T005 [US1] Update all default space templates to include allowGuestContributions: false in src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.community.ts
- [ ] T006 [US1] Update additional space templates in src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.innovation.ts
- [ ] T007 [US1] Update knowledge space template in src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.knowledge.ts
- [ ] T008 [US1] Regenerate GraphQL schema by running pnpm run schema:print and pnpm run schema:sort

**Checkpoint**: At this point, User Story 1 should be fully functional - space admins can control guest access

---

## Phase 4: User Story 2 - Default security posture (Priority: P1)

**Goal**: New spaces default to allowGuestContributions = false for security-first approach

**Independent Test**: Create a new space and verify that guest contributions are disabled by default

### Implementation for User Story 2

- [ ] T009 [US2] Verify migration sets default false for all existing spaces (covered by T004 migration)
- [ ] T010 [US2] Verify template defaults ensure new spaces have allowGuestContributions: false (covered by T005-T007)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - default security posture maintained

---

## Phase 5: User Story 3 - Policy enforcement consistency (Priority: P2)

**Goal**: Guest contributions policy is consistently enforced across all space activity types

**Independent Test**: With guest contributions disabled, verify consistent policy enforcement across different space features

### Implementation for User Story 3

- [ ] T011 [US3] Document policy enforcement points for future enforcement implementation in plan.md
- [ ] T012 [US3] Add allowGuestContributions field validation to space settings service (if custom validation needed)

**Checkpoint**: All core user stories should now be independently functional

---

## Phase 6: User Story 4 - Migration and backward compatibility (Priority: P3)

**Goal**: All existing spaces have guest contributions disabled when feature is introduced

**Independent Test**: Verify that after migration, all existing spaces have guest contributions disabled

### Implementation for User Story 4

- [ ] T013 [US4] Validate migration script covers all existing spaces (covered by T004)
- [ ] T014 [US4] Validate migration script covers all template content spaces (covered by T004)

**Checkpoint**: All user stories should now be independently functional with full backward compatibility

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and schema updates

- [ ] T015 [P] Run pnpm run schema:diff to validate schema changes are non-breaking
- [ ] T016 [P] Update schema-baseline.graphql if schema:diff shows expected changes
- [ ] T017 Validate all spaces have allowGuestContributions field after migration
- [ ] T018 Run final schema validation with pnpm run schema:validate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No setup needed - using existing infrastructure
- **Foundational (Phase 2)**: No dependencies - can start immediately, BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Builds on User Story 1 templates
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independent of other stories
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Independent of other stories

### Within Each User Story

- Domain interface and DTOs before migration
- Migration before template updates
- Template updates before schema generation
- Schema generation before validation

### Parallel Opportunities

- All Foundational tasks T001-T003 (interface and DTOs) marked [P] can run in parallel
- Template updates T005-T007 can run in parallel within User Story 1
- User Stories 3 and 4 can run in parallel after User Stories 1-2 complete
- Schema validation tasks T015-T016 can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all domain model updates together:
Task: "Add allowGuestContributions field to ISpaceSettingsCollaboration interface"
Task: "Add allowGuestContributions field to CreateSpaceSettingsCollaborationInput DTO"
Task: "Add allowGuestContributions field to UpdateSpaceSettingsCollaborationInput DTO"

# Launch all template updates together (after migration):
Task: "Update community space template"
Task: "Update innovation space template"
Task: "Update knowledge space template"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 2: Foundational (domain model changes)
2. Complete Phase 3: User Story 1 (admin control)
3. Complete Phase 4: User Story 2 (default security)
4. **STOP and VALIDATE**: Test space creation and settings toggle
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Foundational → Domain model ready
2. Add User Story 1-2 → Test admin control and defaults → Deploy/Demo (MVP!)
3. Add User Story 3 → Test policy enforcement documentation → Deploy/Demo
4. Add User Story 4 → Test migration validation → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundational together (T001-T004)
2. Once Foundational is done:
   - Developer A: User Stories 1-2 (template updates)
   - Developer B: User Story 3 (enforcement documentation)
   - Developer C: User Story 4 (migration validation)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Following allowMembersToVideoCall pattern exactly - no new architecture
- Migration pattern proven and low-risk
- Schema changes are additive only (non-breaking)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

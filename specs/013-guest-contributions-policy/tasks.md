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

## Phase 1: Add Domain Model and Database Structure

**Purpose**: Update domain interface, DTOs, and create database migration

**Alignment**: Matches plan.md Task 1-4 (Interface Updates, DTO Updates, Migration)

- [ ] T001 [P] Add allowGuestContributions field to ISpaceSettingsCollaboration interface in src/domain/space/space.settings/space.settings.collaboration.interface.ts
- [ ] T002 [P] Add allowGuestContributions field to CreateSpaceSettingsCollaborationInput DTO in src/domain/space/space.settings/dto/space.settings.collaboration.dto.create.ts
- [ ] T003 [P] Add allowGuestContributions field to UpdateSpaceSettingsCollaborationInput DTO in src/domain/space/space.settings/dto/space.settings.collaboration.dto.update.ts
- [ ] T004 Create database migration following pattern from 1759156590119-addSettingAllowMembersToVideoCall.ts in src/migrations/

**Checkpoint**: Domain model and migration ready for template updates

---

## Phase 2: Update Templates and Defaults

**Purpose**: Update space template defaults to include allowGuestContributions: false

**Alignment**: Matches plan.md Task 5 (Update Template Defaults)

- [ ] T005 [P] Update space L0 template to include allowGuestContributions: false in src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0.ts
- [ ] T006 [P] Update subspace template to include allowGuestContributions: false in src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.subspace.ts
- [ ] T007 [P] Update knowledge base callouts template (if contains collaboration settings) in src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.callouts.vc.knowledge.base.ts
- [ ] T008 [P] Update tutorials callouts template (if contains collaboration settings) in src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.callouts.space.l0.tutorials.ts

**Checkpoint**: All templates updated with secure defaults

---

## Phase 3: Generate GraphQL Schema

**Purpose**: Regenerate GraphQL schema to expose new field

**Alignment**: Matches plan.md Task 6 (Generate Schema)

- [ ] T009 Regenerate GraphQL schema by running pnpm run schema:print and pnpm run schema:sort

**Checkpoint**: GraphQL schema updated and exposed

---

## Phase 4: Validate Implementation

**Purpose**: Validate schema changes and verify migration correctness

**Alignment**: Matches plan.md Validation Steps

- [ ] T010 [P] Run pnpm run schema:diff to validate schema changes are non-breaking
- [ ] T011 [P] Verify migration sets default false for all existing spaces
- [ ] T012 [P] Verify template defaults ensure new spaces have allowGuestContributions: false
- [ ] T013 Run final schema validation with pnpm run schema:validate

**Checkpoint**: Implementation validated and ready for deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: Domain model and migration - can start immediately
- **Phase 2**: Template updates - depends on Phase 1 completion
- **Phase 3**: Schema generation - depends on Phase 2 completion
- **Phase 4**: Validation - depends on Phase 3 completion

### Task Dependencies Within Phases

**Phase 1 (Parallel):**

- T001-T003 can run in parallel (different files)
- T004 can run in parallel with T001-T003

**Phase 2 (Parallel):**

- T005-T008 can all run in parallel (different template files)

**Phase 3 (Sequential):**

- T009 must run after Phase 2 completion

**Phase 4 (Parallel):**

- T010-T012 can run in parallel
- T013 runs after T010-T012

### Parallel Opportunities

- **Phase 1**: All 4 tasks (T001-T004) can run simultaneously
- **Phase 2**: All 4 template updates (T005-T008) can run simultaneously
- **Phase 4**: Schema validation tasks (T010-T012) can run simultaneously

---

## Parallel Example: Phase Execution

```bash
# Phase 1 - Launch all domain model updates and migration together:
Task T001: "Add allowGuestContributions field to ISpaceSettingsCollaboration interface"
Task T002: "Add allowGuestContributions field to CreateSpaceSettingsCollaborationInput DTO"
Task T003: "Add allowGuestContributions field to UpdateSpaceSettingsCollaborationInput DTO"
Task T004: "Create database migration"

# Phase 2 - Launch all template updates together (after Phase 1):
Task T005: "Update space L0 template"
Task T006: "Update subspace template"
Task T007: "Update knowledge base callouts template"
Task T008: "Update tutorials callouts template"

# Phase 3 - Sequential schema generation (after Phase 2):
Task T009: "Regenerate GraphQL schema"

# Phase 4 - Launch validation tasks in parallel (after Phase 3):
Task T010: "Run schema:diff validation"
Task T011: "Verify migration defaults"
Task T012: "Verify template defaults"
# Then:
Task T013: "Run final schema validation"
```

---

## Implementation Strategy

### Direct Implementation (Follows plan.md exactly)

1. **Phase 1**: Add domain model and database structure
   - Update interface and DTOs (T001-T003)
   - Create migration (T004)
2. **Phase 2**: Update templates and defaults
   - Update all 4 template files (T005-T008)
3. **Phase 3**: Generate GraphQL schema
   - Regenerate schema artifacts (T009)
4. **Phase 4**: Validate implementation
   - Run validation checks (T010-T013)

**Total Estimated Effort**: 2-4 hours (as specified in plan.md)

### Quality Gates

- After Phase 1: Verify domain model compiles and migration is valid
- After Phase 2: Verify templates have correct structure
- After Phase 3: Verify schema is generated without errors
- After Phase 4: Verify all validation checks pass

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- Task structure directly maps to plan.md implementation steps 1-6
- Following allowMembersToVideoCall pattern exactly - no new architecture
- Migration pattern proven and low-risk
- Schema changes are additive only (non-breaking)
- Template file paths verified against actual /src/core/bootstrap structure
- Commit after each phase completion
- 4 sequential phases aligned with plan.md phases
- Total: 13 tasks across 4 phases (reduced from original 18 tasks)

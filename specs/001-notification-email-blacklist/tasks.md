# Tasks: Notification Email Blacklist

**Input**: Design documents from `/specs/001-notification-email-blacklist/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align contracts and test scaffolding before touching runtime code.

- [ ] T001 Align GraphQL contract additions for add/remove operations and integration field description in `specs/001-notification-email-blacklist/contracts/notification-email-blacklist.graphql`.
- [ ] T002 [P] Scaffold the integration test harness with describe blocks for mutations/queries in `test/integration/platform/platform-settings.blacklist.spec.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ensure platform settings data structures can store and expose the blacklist array.

- [ ] T003 Add the `notificationEmailBlacklist` field (with `@Field(() => [String])`) to `src/platform/platform-settings/platform.settings.integrations.interface.ts`.
- [ ] T004 Allow bulk updates of `notificationEmailBlacklist` (with array + email validators) inside `src/platform/platform-settings/dto/platform.settings.integration.dto.update.ts`.
- [ ] T005 Update `src/platform/platform-settings/platform.settings.service.ts` so `updateSettings` copies `notificationEmailBlacklist` values and initializes an empty array when missing.

**Checkpoint**: Integration settings now persist the blacklist array; user stories can proceed.

---

## Phase 3: User Story 1 – Block targeted email addresses (Priority: P1) 🎯 MVP

**Goal**: Let platform admins add a fully qualified email to the blacklist via GraphQL mutation and persist it in platform settings.

**Independent Test**: Calling `addNotificationEmailToBlacklist` returns the updated list, and the subsequent `platform.settings.integration.notificationEmailBlacklist` query reflects the change.

### Implementation

- [ ] T006 [P] [US1] Create `NotificationEmailAddressInput` with `@IsEmail()` + lowercase sanitizer in `src/platform/platform-settings/dto/notification-email-blacklist.input.ts` and export it via `src/platform/platform-settings/index.ts`.
- [ ] T007 [US1] Implement `addNotificationEmailToBlacklistOrFail` (dedupe, cap ≤250, wildcard rejection) in `src/platform/platform-settings/platform.settings.service.ts`.
- [ ] T008 [US1] Add the `addNotificationEmailToBlacklist` mutation in `src/platform/platform/platform.resolver.mutations.ts`, wiring authorization, service call, and persistence.
- [ ] T009 [P] [US1] Cover success/validation paths for the add method in `test/unit/platform/platform-settings/platform.settings.service.blacklist.spec.ts`.
- [ ] T010 [US1] Add integration coverage for the add mutation + query reflection in `test/integration/platform/platform-settings.blacklist.spec.ts`.

**Checkpoint**: Admins can add emails and verify them via GraphQL; downstream services can pull the updated list.

---

## Phase 4: User Story 2 – Remove obsolete blacklist entries (Priority: P2)

**Goal**: Allow admins to remove an email from the blacklist when it becomes eligible again.

**Independent Test**: `removeNotificationEmailFromBlacklist` returns the array without the removed email, and the follow-up query mirrors the change.

### Implementation

- [ ] T011 [US2] Implement `removeNotificationEmailFromBlacklistOrFail` (error when email missing) in `src/platform/platform-settings/platform.settings.service.ts`.
- [ ] T012 [US2] Add the `removeNotificationEmailFromBlacklist` mutation to `src/platform/platform/platform.resolver.mutations.ts` with matching audit logging and persistence.
- [ ] T013 [P] [US2] Extend `test/unit/platform/platform-settings/platform.settings.service.blacklist.spec.ts` with removal and "email not found" cases.
- [ ] T014 [US2] Extend `test/integration/platform/platform-settings.blacklist.spec.ts` to cover removal happy-path plus error response.

**Checkpoint**: Admins can both add and remove entries without affecting other recipients.

---

## Phase 5: User Story 3 – Audit blacklist via GraphQL (Priority: P3)

**Goal**: Ensure support/compliance staff can view the blacklist through the documented GraphQL path even when empty.

**Independent Test**: The `platform` query returns `notificationEmailBlacklist` consistently (empty array when unset) within the success criteria latency.

### Implementation

- [ ] T015 [US3] Guarantee serialization populates an empty array when the blacklist is undefined before returning settings in `src/platform/platform-settings/platform.settings.service.ts`.
- [ ] T016 [US3] Update `src/platform/platform/platform.resolver.queries.ts` (and any DTO typings) so the `platform` query exposes `notificationEmailBlacklist` without additional resolvers.
- [ ] T017 [P] [US3] Add query-only integration assertions for the blacklist field (non-empty + empty scenarios) in `test/integration/platform/platform-settings.blacklist.spec.ts`.

**Checkpoint**: Support staff can audit the blacklist solely via GraphQL queries.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 Refresh the step-by-step instructions in `specs/001-notification-email-blacklist/quickstart.md` with the final mutation/query names and variables.
- [ ] T019 Document the blacklist admin workflow and downstream sync expectations in `docs/Notifications.md`.
- [ ] T020 Regenerate `schema.graphql` (plus run `pnpm run schema:diff`) to capture the new field and mutations, ensuring the diff is committed or approved.

---

## Dependencies & Execution Order

1. **Phase 1 → Phase 2**: Contracts/test scaffolding must exist before modifying runtime types.
2. **Phase 2 → User Stories**: Interface + service scaffolding (T003–T005) is required before any story-specific implementation.
3. **User Story Independence**:
   - **US1 (P1)** starts immediately after Phase 2 and delivers the MVP.
   - **US2 (P2)** can start once Phase 2 is done; it reuses service structures but does not depend on US1 completion.
   - **US3 (P3)** depends only on Phase 2 and the availability of persisted data (from US1/US2) but can be developed in parallel once the array exists.
4. **Polish** runs after all desired stories are complete.

## Parallel Execution Examples

- **Setup**: T001 and T002 touch different files and can run together.
- **US1**: While T007/T008 implement logic, T006 can be created independently and T009 can begin with test scaffolding.
- **US2**: T013 (unit tests) can be prepared in parallel with T011/T012 since it focuses on the same file but different describe blocks.
- **US3**: T017 (integration assertions) can run in parallel with T015–T016 after the serialization guard is stubbed.

## Implementation Strategy

1. **MVP (US1)**: Complete Phases 1–3 so admins can add blacklist entries and see them via GraphQL.
2. **Incremental delivery**:
   - Add US2 to allow removals without touching US1 flows.
   - Add US3 to provide read-only auditing and documentation updates.
3. **Each story is independently testable** per the acceptance scenarios, allowing deployment between phases if desired.

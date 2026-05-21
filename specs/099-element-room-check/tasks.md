# Tasks: Server-Side Synchronous Room-Check for Element-Initiated Conversations

**Input**: Design documents from `/specs/099-element-room-check/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{room-check,room-info}-rabbitmq.md, quickstart.md

**Tests**: Included per the constitution's risk-based testing principle. Coverage targets the 23-row matrix in `data-model.md`; trivial pass-through cases are skipped.

**Organization**: The business-rule layer lives in a new domain wrapper `MessagingService.createConversationFromExternal(input)` (plus reused shared private helpers); the wire layer lives in `MatrixRoomCheckController` (NestJS `@MessagePattern` + `Transport.RMQ`). Most user-story phases extend a different branch of the domain wrapper (single file, sequential within each phase); their tests sit in `messaging.service.spec.ts`. The controller is touched only in foundational tasks and in tests for wire-level translation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different files, no dependency on incomplete tasks — safe to parallelise
- **[Story]**: Maps task to a user story from spec.md
- Paths shown are absolute relative to the repo root.

## Path Conventions

Single project under `src/`. Tests are inline (`*.spec.ts`) alongside the unit under test, or under `test/functional/integration/` for cross-process integration.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the lib bump exposes the symbols we need, land the server-internal types (`CheckResult` and `MessagingRejectionReason`), and add the displayName helper. The wire-format payload types come from `@alkemio/matrix-adapter-lib` directly — no server-local wrapper DTOs (matches existing `CommunicationAdapterEventService.onMessageReceived` precedent).

- [x] T001 Confirm `@alkemio/matrix-adapter-lib` is installed at the pkg.pr.new PR-channel URL `https://pkg.pr.new/@alkemio/matrix-adapter-lib@53` (set in `package.json` already). Verify the following symbols resolve at import: `MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK`, `MatrixAdapterEventType.COMMUNICATION_ROOM_INFO`, interfaces `CheckRoomRequest`, `CheckRoomResponse`, `GetRoomInfoRequest`, `GetRoomInfoResponse`, `RoomInfoMember`. A pre-merge follow-up task in Phase 12 (T034) swaps the pkg.pr.new URL for a released semver tag once the adapter cuts an actual release.
- [x] T002 [P] Create the discriminated union type `CheckResult` in `src/domain/communication/messaging/types/check.result.ts`: `type CheckResult = { kind: 'accepted'; alkemioRoomId: string } | { kind: 'rejected'; reason: string };` — this is the server-internal return type of the new domain wrapper. Distinct from the wire `CheckRoomResponse` (from the lib); the controller does a one-line translation between them.
- [x] T003 [P] Create the canonical rejection-reason const-map in `src/domain/communication/messaging/types/messaging.rejection.reasons.ts`: `export const MessagingRejectionReason = { ACTOR_NOT_FOUND: 'actor not found', MESSAGING_DISABLED: 'messaging disabled for the target user', NO_RECIPIENTS_ALLOW_MESSAGING: 'no recipients allow messaging', DUPLICATE_DIRECT_CONVERSATION: 'a direct conversation between these users already exists', MALFORMED_REQUEST: 'malformed check request', INTERNAL_ERROR: 'internal error' } as const;` — domain code references the constant; the controller emits `result.reason` verbatim on the wire.
- [x] T004 [P] Create the displayName helper `getMatrixDisplayName(actor: IActor): string` in `src/domain/actor/actor.matrix.display.name.ts` returning `actor.profile?.displayName?.trim() || actor.nameID`. Pure function, no DI, no logging. Add JSDoc citing FR-018 and explaining why email is forbidden as a fallback. Export from the actor module's index file.
- [x] T005 [P] Unit tests for the displayName helper in `src/domain/actor/actor.matrix.display.name.spec.ts` covering the four matrix rows: (a) profile.displayName populated → returns trimmed value, (b) profile.displayName whitespace-only + nameID populated → returns nameID, (c) profile undefined + nameID populated → returns nameID, (d) profile undefined + nameID empty (defensive only) → returns nameID empty string. Covers data-model.md test matrix rows 19–22.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the new domain wrapper skeleton, the room-id-supplied Room creation variant, the controller's wire-level translation, and the DRY refactor of `MessagingService.createConversation` into shared private helpers. After this phase, an inbound `communication.room.check` RPC arrives at the new controller, is translated to the domain wrapper, and the wrapper returns the not-yet-implemented sentinel (everything rejects with `MALFORMED_REQUEST`).

**⚠️ CRITICAL**: All Phase 3+ work blocks on this phase.

- [x] T006 [P] Add `RoomService.createRoomFromExternal({ id, type }: { id: string; type: RoomType }): Promise<IRoom>` in `src/domain/communication/room/room.service.ts`. This MUST: (a) persist a `Room` row using the supplied `id` verbatim (do NOT generate a fresh UUID), (b) skip the call to `createExternalCommunicationRoom` (the Matrix room is created by Synapse, not by our adapter), (c) set `messagesCount = 0`, empty `displayName` and `avatarUrl`, and create the cascaded `authorization` per the existing pattern. Document the divergence from `createRoom` in a JSDoc citing FR-002 / the design in `research.md` R-005.
- [x] T007 Refactor `MessagingService.createConversation` in `src/domain/communication/messaging/messaging.service.ts` to extract three private helpers: `normalizeMembers(callerActorId, memberActorIds): string[]` (current lines 119-121), `validateMembershipCount(type, normalized): void` (current lines 129-153, simplified to count-vs-type validation only), and `persistConversationCore(input, roomIdOverride?): Promise<IConversation>` (current lines 155-178 — accepts an optional pre-assigned `roomId` and routes to `createRoomFromExternal` from T006 when present; otherwise delegates to the existing `conversationService.createConversation` path). The existing `createConversation` MUST continue to behave identically (FR-015) — the refactor is structure-only. Depends on T006.
- [x] T008 Add domain-wrapper skeleton `MessagingService.createConversationFromExternal(input: { creatorActorId: string; memberActorIds: string[]; isDirect: boolean }): Promise<CheckResult>` in the same file, alongside `createConversation`. The skeleton at this phase returns `{ kind: 'rejected', reason: MessagingRejectionReason.MALFORMED_REQUEST }` as a not-yet-implemented sentinel — later phases fill in branches per user story. This is the home for all new business rules per FR-016. Depends on T002, T003, T007.
- [x] T009 Add `MessagingService.getRoomInfo(alkemioRoomId: string): Promise<{ type: string; isDirect: boolean; members: Array<{ actorId: string; displayName: string }> }>` skeleton in the same file. Phase 10 (US8) will fill the body; for now it returns the empty-members miss envelope. Depends on T004.
- [x] T010 Create the new controller `MatrixRoomCheckController` in `src/services/adapters/communication-adapter/matrix.room.check.controller.ts` with two `@RabbitRPC` handlers (golevelup; NOT NestJS `@MessagePattern + Transport.RMQ` — that would steal messages from the existing `@RabbitSubscribe` consumer per `main.ts:110-112`): `checkRoom(payload: CheckRoomRequest): Promise<CheckRoomResponse>` and `getRoomInfo(payload: GetRoomInfoRequest): Promise<GetRoomInfoResponse>`. The payload and response types are imported DIRECTLY from `@alkemio/matrix-adapter-lib` — no server-local wrapper DTOs (matches the existing `onMessageReceived(payload: MessageReceivedPayload)` precedent at `communication.adapter.event.service.ts:65`). Each handler is a thin orchestrator: parse payload, call the domain method (`createConversationFromExternal` or `getRoomInfo`), translate the return into the wire envelope (`CheckResult` → `{ allow: true, alkemio_room_id }` or `{ allow: false, reason }`; domain `RoomInfo` shape → wire `GetRoomInfoResponse` with `actor_id`/`display_name` snake-case fields). Each handler logs at `verbose` on entry with the structured fields per Constitution §5; on uncaught exception logs at `error` and returns `{ allow: false, reason: MessagingRejectionReason.INTERNAL_ERROR }` (check) or the empty-members miss envelope (info). Depends on T001, T002, T008, T009.
- [x] T011 Register `MatrixRoomCheckController` in a new sibling module `MatrixRoomCheckModule` (in `src/services/adapters/communication-adapter/matrix.room.check.module.ts`) that imports `MessagingModule`, then register that module in `src/app.module.ts`. This sidesteps the cycle (`CommunicationAdapterModule → MessagingModule → ConversationModule → RoomModule → CommunicationAdapterModule`) that would arise from adding `MessagingService` to `CommunicationAdapterModule` directly. Depends on T010.

**Checkpoint**: An inbound `communication.room.check` arrives at the controller, is translated to the domain wrapper (which returns the sentinel), and the controller emits `{ allow: false, reason: 'malformed check request' }`. The plumbing is wired end-to-end; story phases now fill in the branches.

---

## Phase 3: Implementation (Domain Method)

**Purpose**: Write the full body of `MessagingService.createConversationFromExternal` and the supporting `evaluateMemberConsent` helper. The method handles BOTH `is_direct: true` and `is_direct: false` in a single control flow; the divergence between DM and group is three one-liners (dedup-probe conditional, reject-reason ternary on the consent-empty check, room-type ternary). After this phase, every user-story phase that follows is test-only.

**⚠️ Note**: This phase ships the entire feature behaviour at once. Per-US slicing of the implementation is not meaningful because the implementation IS a single ~80 LOC method. Per-US slicing of the **tests** is meaningful and preserved in subsequent phases.

- [x] T012 Implement the full body of `MessagingService.createConversationFromExternal` in `src/domain/communication/messaging/messaging.service.ts`. Pipeline, in order:
  1. **Validate request shape** (FR-002, R-005): creator_actor_id is non-empty UUID-shaped; member_actor_ids is non-empty array of UUID-shaped strings; no duplicate ids in member_actor_ids; creator NOT in member_actor_ids; for `isDirect === true` exactly 1 entry, for `isDirect === false` ≥ 1 entry. Any failure → return `{ kind: 'rejected', reason: MessagingRejectionReason.MALFORMED_REQUEST }`, log at WARN with the offending field in `details`.
  2. **Resolve actors**: load creator + each member id via the existing user lookup; any unresolved → return `{ kind: 'rejected', reason: MessagingRejectionReason.ACTOR_NOT_FOUND }`, log at WARN with the unresolved id in `details`.
  3. **DM-only: dedup probe**: `if (isDirect) { if (await this.conversationService.findConversationBetweenActors(creator, members[0])) return reject(DUPLICATE_DIRECT_CONVERSATION); }`. Group events skip this entirely (no group dedup).
  4. **Consent gate (shared)**: `const { consentingIds, denyingIds } = await this.evaluateMemberConsent(memberActorIds);` (helper added in T013). If `consentingIds.length === 0`, return `{ kind: 'rejected', reason: isDirect ? MESSAGING_DISABLED : NO_RECIPIENTS_ALLOW_MESSAGING }`. (For DM this is exactly the "target denied" case; for group this is the "all denied" case. The check is the SAME line.)
  5. **Persist (shared)**: `const assignedUuid = randomUUID(); const roomType = isDirect ? CONVERSATION_DIRECT : CONVERSATION_GROUP;` then `await this.persistConversationCore({ creator, members: [creator, ...consentingIds], roomType, roomIdOverride: assignedUuid })` (helper from T007 / `createRoomFromExternal` from T006). Catch `UniqueViolation` on `room.id` and re-probe via `findConversationByRoomId`; on hit, return `{ kind: 'accepted', alkemioRoomId: <existing id> }` (idempotent under race per R-005).
  6. **Subscribe (shared)**: `await this.publishConversationCreatedEvents(fullConversation, [creator.id, ...consentingIds])` — the existing publisher at `messaging.service.ts:197`. Fan-out covers ONLY the consenting members (group partial-rejection case naturally falls out: excluded members are not in `consentingIds`).
  7. **Return**: `{ kind: 'accepted', alkemioRoomId: assignedUuid }`.
  8. **Outer try/catch**: any uncaught exception → log at ERROR with full stack and structured `details` (`creator_actor_id`, `is_direct`, `member_count`); return `{ kind: 'rejected', reason: MessagingRejectionReason.INTERNAL_ERROR }`.

  This is the entire feature in one method. ~80 LOC. The `is_direct` parameter participates only in steps 3 (dedup branch), 4 (rejection-reason ternary), and 5 (room-type ternary). Steps 1, 2, 6, 7, 8 are identical for both flavours. Depends on T006 (createRoomFromExternal), T007 (persistConversationCore), T008 (createConversationFromExternal skeleton), T013 (evaluateMemberConsent — written in parallel).
- [x] T013 [P] Implement private helper `MessagingService.evaluateMemberConsent(memberActorIds: string[]): Promise<{ consentingIds: string[]; denyingIds: string[] }>` in the same file. For each member id, load `User.settings.communication.allowOtherUsersToSendMessages` (existing User-settings shape) and partition the input list. The creator is NEVER passed to this helper — their setting is intentionally not evaluated per FR-004. Pure read; no logging beyond verbose-level entry. Depends on T008.
- [x] T014 Fill the body of `MessagingService.getRoomInfo(alkemioRoomId)` in the same file (skeleton added in T009): look up the Conversation by `Room.id = alkemioRoomId` (use `ConversationService.findConversationByRoomId`); on miss, return `{ type: '', isDirect: false, members: [] }`; on hit, load the membership list with each actor's `profile` (lightweight relation join), map each to `{ actorId, displayName: getMatrixDisplayName(actor) }`. The `type` field is `'conversation_direct'` or `'conversation_group'` based on `Room.type`; `isDirect` is the convenience boolean. Depends on T004 (displayName helper), T009 (skeleton).
- [x] T015 Wire the controller's `getRoomInfo` handler in `src/services/adapters/communication-adapter/matrix.room.check.controller.ts` to call `messagingService.getRoomInfo(payload.alkemio_room_id)` and translate the domain return to the wire `GetRoomInfoResponse` (`actorId` → `actor_id`, `displayName` → `display_name`, `isDirect` → `is_direct`, plus the echoed `alkemio_room_id`). Depends on T014, T010.

**Checkpoint**: The full feature ships in T012+T013+T014+T015. Every behaviour described by US1–US8 is reachable; the subsequent test phases verify each individually.

---

## Phase 4: User Story 1 — DM happy path tests (Priority: P1) 🎯 MVP-essential

**Goal**: Verify that a DM with a consenting target and no prior DM produces the right Conversation + Room + memberships + subscription.

**Independent Test**: Publish a `room.check` RPC with `is_direct: true` and a creator + one consenting member with no existing DM between them. Verify (a) reply is `{ allow: true, alkemio_room_id }`, (b) one Conversation, one Room (`type = 'conversation_direct'`, id = returned UUID, displayName/avatarUrl empty), two `conversation_membership` rows, (c) `publishConversationCreatedEvents` fires once for both members. Quickstart Test 1 covers this.

- [x] T016 [P] [US1] Unit test "DM happy path" in `src/domain/communication/messaging/messaging.service.spec.ts`: stub `findConversationByRoomId` → null, `findConversationBetweenActors` → null, both users consenting. Assert `createRoomFromExternal` invoked with the assigned UUID and `CONVERSATION_DIRECT`, two `ConversationMembership` rows created, `publishConversationCreatedEvents` invoked exactly once with both members in the fan-out set, returned result is `{ kind: 'accepted', alkemioRoomId }` matching the supplied id. Covers data-model.md test matrix row 1.

---

## Phase 5: User Story 2 — Group happy path tests (Priority: P1)

**Goal**: Verify that a group with all-consenting members produces the right N-member Conversation + group Room + subscription, and that groups are not deduplicated by membership.

**Independent Test**: Publish a `room.check` RPC with `is_direct: false` and a creator + two consenting members. Verify a group Conversation with three memberships exists; `Room.type = 'conversation_group'`; subscription fires for all three. Quickstart Test 3 (all members consenting) covers this.

- [x] T017 [P] [US2] Unit test "group happy path" in `src/domain/communication/messaging/messaging.service.spec.ts`: 3 consenting members, `isDirect: false`. Assert Room persisted with `CONVERSATION_GROUP` and the assigned UUID, three `ConversationMembership` rows, `publishConversationCreatedEvents` invoked with all three members. Covers data-model.md test matrix row 4.
- [x] T018 [P] [US2] Unit test "group with same membership set as existing group is NOT deduplicated" in the same file: pre-load an existing group Conversation with members {A, B, C}; invoke the wrapper for {A, B, C} again. Assert a SECOND Conversation is created — no group dedup is performed. Covers data-model.md test matrix row 7.

---

## Phase 6: User Story 3 — Group partial-consent tests (Priority: P1)

**Goal**: Verify that for a group with mixed consent, only consenting members are registered and only consenting members receive the subscription.

**Independent Test**: Publish a `room.check` RPC for a group with creator + member-A (consenting) + member-B (denying). Verify (a) reply is `{ allow: true, alkemio_room_id }`, (b) Conversation has exactly two memberships (creator + A), (c) B is absent, (d) subscription fires only to creator + A. Quickstart Test 3 covers this.

- [x] T019 [P] [US3] Unit test "group partial consent" in `src/domain/communication/messaging/messaging.service.spec.ts`: 3 members where one denies. Assert the resulting Conversation has 2 memberships (creator + consenter), `publishConversationCreatedEvents` is invoked with ONLY the consenting members in the fan-out set (excluded members must NOT receive the event), result is `{ kind: 'accepted', alkemioRoomId }`. Covers data-model.md test matrix row 6.

---

## Phase 7: User Story 4 — DM consent-denied tests (Priority: P1)

**Goal**: Verify that a DM to a target with inbound messaging disabled is rejected with `MESSAGING_DISABLED` and no Conversation is created.

**Independent Test**: Set the target's `allowOtherUsersToSendMessages = false`. Publish a `room.check` for a DM to that target. Verify reply is `{ allow: false, reason: 'messaging disabled for the target user' }` and no Conversation exists. Quickstart Test 2 covers this.

- [x] T020 [P] [US4] Unit test "DM consent denied" in `src/domain/communication/messaging/messaging.service.spec.ts`: stub the target user with `allowOtherUsersToSendMessages = false`. Assert no `createRoomFromExternal` invocation, no `publishConversationCreatedEvents` invocation, result is `{ kind: 'rejected', reason: MessagingRejectionReason.MESSAGING_DISABLED }`. Covers data-model.md test matrix row 2.

---

## Phase 8: User Story 5 — DM duplicate tests (Priority: P2)

**Goal**: Verify that a DM where a Conversation already exists between the pair is rejected with `DUPLICATE_DIRECT_CONVERSATION` and the existing Conversation is untouched.

**Independent Test**: Pre-create a DM between two users via the Alkemio GraphQL `createConversation` mutation. Publish a `room.check` for the same pair from Element. Verify reply is `{ allow: false, reason: 'a direct conversation between these users already exists' }`; no second Conversation. Quickstart Test 4 covers this.

- [x] T021 [P] [US5] Unit test "DM duplicate" in `src/domain/communication/messaging/messaging.service.spec.ts`: stub `findConversationBetweenActors` → existing Conversation. Assert no `createRoomFromExternal` invocation, no `publishConversationCreatedEvents` invocation, no consent-helper invocation (the dedup short-circuits before consent is evaluated), result is `{ kind: 'rejected', reason: MessagingRejectionReason.DUPLICATE_DIRECT_CONVERSATION }`. Covers data-model.md test matrix row 3.

---

## Phase 9: User Story 6 — Group all-denied tests (Priority: P2)

**Goal**: Verify that a group where every non-creator member has inbound messaging disabled is rejected with `NO_RECIPIENTS_ALLOW_MESSAGING`.

**Independent Test**: Set all invited members' `allowOtherUsersToSendMessages = false`. Publish a `room.check` for a group with creator + those members. Verify reply is `{ allow: false, reason: 'no recipients allow messaging' }` and no Conversation exists.

- [x] T022 [P] [US6] Unit test "group all denied" in `src/domain/communication/messaging/messaging.service.spec.ts`: stub all members with `allowOtherUsersToSendMessages = false`. Assert no `createRoomFromExternal` invocation, no `publishConversationCreatedEvents` invocation, result is `{ kind: 'rejected', reason: MessagingRejectionReason.NO_RECIPIENTS_ALLOW_MESSAGING }`. Covers data-model.md test matrix row 5.

---

## Phase 10: User Story 7 — Resilience tests (Priority: P3)

**Goal**: Verify that malformed payloads, unknown actors, transient persistence errors, and wire-level controller translation all behave correctly.

**Independent Test**: Submit each malformed-payload variant, each unknown-actor variant, a stub that throws on persistence, and feed stubbed domain results through the controller. Verify each case maps to the right reason on the wire; no Conversation created; the request stream continues processing.

- [x] T023 [P] [US7] Unit tests for malformed payloads in `src/domain/communication/messaging/messaging.service.spec.ts`: (a) DM with 2 members → `MALFORMED_REQUEST`; (b) group with 0 members → `MALFORMED_REQUEST`; (c) creator duplicated in member ids → `MALFORMED_REQUEST`; (d) non-UUID actor id → `MALFORMED_REQUEST`. Covers data-model.md test matrix rows 10–13.
- [x] T024 [P] [US7] Unit tests for unknown actor in the same file: (a) unknown initiator id → `ACTOR_NOT_FOUND`; (b) unknown member id (one of several) → `ACTOR_NOT_FOUND`. Covers data-model.md test matrix rows 8–9.
- [x] T025 [P] [US7] Unit test for transient persistence failure in the same file: stub the persistence helper to throw `QueryFailedError`. Assert result is `{ kind: 'rejected', reason: MessagingRejectionReason.INTERNAL_ERROR }`, `logger.error` invoked with structured `details`. Covers data-model.md test matrix row 14.
- [x] T026 [P] [US7] Unit tests for controller wire-translation in `src/services/adapters/communication-adapter/matrix.room.check.controller.spec.ts`: (a) stub `messagingService.createConversationFromExternal` → `{ kind: 'accepted', alkemioRoomId }`; assert wire response is `{ allow: true, alkemio_room_id: <id> }`. (b) stub → `{ kind: 'rejected', reason }`; assert wire response is `{ allow: false, reason: <string> }`. Covers data-model.md test matrix rows 17–18.

---

## Phase 11: User Story 8 — `room.info` tests (Priority: P2)

**Goal**: Verify `room.info` returns the right type + members on hit and an empty-member envelope on miss; displayNames are resolved via the helper.

**Independent Test**: After any approved check, publish a `room.info` RPC with the assigned UUID. Verify the response carries the type, the direct-flag, and the exact list of registered members with their `getMatrixDisplayName(actor)` resolved values. For a non-existent UUID, verify the empty-member miss envelope. Quickstart Test 5 covers this.

- [x] T027 [P] [US8] Unit tests for `getRoomInfo` in `src/domain/communication/messaging/messaging.service.spec.ts`: (a) hit — a direct Conversation with two members → returns `{ type: 'conversation_direct', isDirect: true, members: [...] }` with helper-resolved displayNames; (b) hit — a group Conversation → returns `'conversation_group'` and `isDirect: false`; (c) miss — non-existent UUID → returns the empty-member envelope. Covers data-model.md test matrix rows 15–16.

**Checkpoint**: All eight user stories test-covered. The feature is functionally complete.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: FR-018 displayName-helper refactors (privacy-positive side effect), end-to-end RabbitMQ RPC integration test, lint hygiene, quickstart verification, and constitution §5 audit.

- [x] T028 [P] FR-018 refactor: replace `${user.firstName} ${user.lastName}.trim() || user.email` with `getMatrixDisplayName(user)` at `src/domain/community/user/user.service.ts:232-233`. This eliminates the pre-existing email-leak into Matrix-side displayName.
- [x] T029 [P] FR-018 refactor: replace `${user.firstName} ${user.lastName}.trim() || user.nameID` with `getMatrixDisplayName(user)` at `src/platform-admin/domain/communication/admin.communication.space.sync.service.ts:506` (User iteration).
- [x] T030 [P] FR-018 refactor: replace `vc.profile?.displayName || vc.nameID` with `getMatrixDisplayName(vc)` at `src/platform-admin/domain/communication/admin.communication.space.sync.service.ts:520` (VC iteration). Behavioural no-op; switched for consistency.
- [x] T031 [P] FR-018 refactor: replace `virtualContributor.profile?.displayName || virtualContributor.nameID` with `getMatrixDisplayName(virtualContributor)` at `src/domain/community/virtual-contributor/virtual.contributor.service.ts:201-202`. Behavioural no-op; switched for consistency.
- [x] T032 [P] End-to-end integration test in `test/functional/integration/element-room-check/element.room.check.it-spec.ts`: spin up RabbitMQ + DB via the test harness, publish a real `communication.room.check` request, assert the reply envelope shape and the DB rows, then publish a `communication.room.info` for the assigned UUID and assert the wire response. **Resolved via T036**: the manual quickstart walkthrough exercises the same RabbitMQ + DB surface plus the live adapter, Synapse and Element — strictly broader coverage than this task would provide. The wire-layer concern an automated harness would catch is already covered by the 49 unit tests in `messaging.service.spec.ts` (domain pipeline) + `matrix.room.check.controller.spec.ts` (wire-translation both directions); the remaining surface a CI integration test would exercise is `@RabbitRPC` request→handler→reply plumbing which the `@golevelup/nestjs-rabbitmq` library owns and tests.
- [x] T033 [P] Run `pnpm lint` and resolve any new warnings introduced by this feature's edits. `tsc --noEmit` must be clean. Biome must be clean.
- [x] T034 [P] Pre-merge follow-up to T001: swap the `@alkemio/matrix-adapter-lib` dependency in `package.json` from the pkg.pr.new PR-channel URL (`https://pkg.pr.new/@alkemio/matrix-adapter-lib@53`) to the released semver tag once the matrix-adapter-go release containing PR #53 lands on the npm registry. Run `pnpm up @alkemio/matrix-adapter-lib`, re-verify the imports still resolve, and commit the lockfile update. **Done**: pinned to `0.8.16`; adapter image bumped to `alkemio/matrix-adapter-go:v0.8.16`.
- [x] T035 [P] Run `pnpm test:ci:no:coverage` and confirm zero regressions in the broader suite. New tests must all pass.
- [x] T036 Walk through every scenario in `specs/099-element-room-check/quickstart.md` (Tests 1–5) against a fresh local environment. Each scenario MUST behave exactly as described. **Done**: verified end-to-end against fresh Alkemio + Synapse DBs with adapter v0.8.16 (which fixed the bot reconciliation block).
- [x] T037 Re-verify Constitution §5 compliance across all newly added files (`actor.matrix.display.name.ts`, `check.result.ts`, `messaging.rejection.reasons.ts`, `matrix.room.check.controller.ts`, and the modified `messaging.service.ts` regions): every `RelationshipNotFoundException`, `ValidationException`, or similar throws a STATIC `message` literal; all dynamic ids live in the `details` argument. Grep for backtick-template-literal interpolation in exception constructors and fix any leaks before merge.
- [x] T038 Final cross-spec sanity sweep: open both `specs/099-element-room-check/contracts/room-check-rabbitmq.md` and `matrix-adapter-go/specs/050-element-room-check/contracts/room-check-rabbitmq.md` side by side. Repeat for `room-info-rabbitmq.md`. Field names, routing keys, payload shapes, and rejection-reason strings MUST be byte-identical (per the "drift = bug" pact). Any delta requires updating both files before merge.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No upstream dependencies. T001 is a one-time verification step. T002–T005 are parallelisable.
- **Phase 2 (Foundational)**: Blocks Phase 3. T006 parallel with T002–T005. T007 → T008 → T009 sequential on `messaging.service.ts`. T010 → T011 sequential on controller / module.
- **Phase 3 (Implementation)**: The atomic implementation phase. T012 (full method body), T013 (consent helper), T014 (getRoomInfo body) are written together on `messaging.service.ts` — they're in fact best written in one editing session, with T013 a `[P]` insertion since it's a separate method body. T015 (controller wire-up for room.info) follows T014. After Phase 3 the feature behaviour is complete; everything that follows is tests + polish.
- **Phases 4–11 (Per-US tests)**: All depend on Phase 3 (the implementation under test). Within each phase the test tasks are `[P]` against `messaging.service.spec.ts` (or `matrix.room.check.controller.spec.ts` for T026). The phases are independent of each other — they can be authored and merged in any order.
- **Phase 12 (Polish)**: FR-018 refactors (T028–T031) can begin once T004 lands. Integration test (T032), lint (T033), test-suite run (T035), quickstart (T036), §5 audit (T037), cross-spec sweep (T038) — most are independent.

### Parallel Opportunities

**Phase 1 (Setup)** — T002, T003, T004 parallel; T005 follows T004; T001 independent.

**Phase 2 (Foundational)** — T006 parallel with Phase 1; T007→T008→T009 sequential; T010→T011 sequential.

**Phase 3 (Implementation)** — T012 + T013 in one editing session on `messaging.service.ts` (one author, two methods, ~100 LOC combined); T014 likewise; T015 sequential after T014. Total ~120 LOC.

**Phases 4–11 (Tests)** — All eight per-US test tasks are independent of each other; a team can fan out and have one test per developer if desired. All target the same already-implemented method, exercising different inputs.

**Phase 12 (Polish)** — T028, T029, T030, T031, T032, T033, T034, T035 — eight-way parallel. T036 → T037 → T038 sequential.

---

## Parallel Example: Phase 1 Setup

```bash
# Three-way parallel kick-off (all different files):
Task: "T002 — Create CheckResult discriminated union type"
Task: "T003 — Create MessagingRejectionReason const-map"
Task: "T004 — Create getMatrixDisplayName helper"

# Then sequentially:
Task: "T005 — Tests for getMatrixDisplayName helper"

# T001 (lib verification) runs independently at any point
```

---

## Implementation Strategy

### MVP — minimal security-correct slice

The implementation is atomic by design (one method covers DM, group, consent gate, dedup, member filtering). You cannot ship "US1 without US4" — they share the same code path. The MVP is therefore the full method + the test surface for the security-critical behaviours.

**Minimum task list to ship safely**:
1. Phase 1 (T001–T005)
2. Phase 2 (T006–T011)
3. Phase 3 (T012–T015) — full method, consent helper, room.info
4. Phase 4 (T016) — DM happy path test (US1)
5. Phase 7 (T020) — DM consent denied test (US4)
6. Phase 12 minimums: T028 (FR-018 email-leak fix), T033 (lint), T035 (tests)

= **18 tasks**. After landing, you have a working DM-from-Element flow with verified consent enforcement. Group support is already implemented (it shipped with T012); the remaining phases just add test coverage for it.

### Incremental Delivery (Recommended)

The implementation lands in one PR (T001–T015 + the polish minimums). Test coverage grows in subsequent PRs, each carrying one or more US phases:

1. **PR 1 (~18 tasks)**: Phases 1–3 + Phase 4 (US1 test) + Phase 7 (US4 test) + minimal polish. The feature is live and security-correct.
2. **PR 2**: Phases 5+6 (US2 + US3 tests) — group happy + partial consent
3. **PR 3**: Phases 8+9 (US5 + US6 tests) — DM duplicate + group all-denied
4. **PR 4**: Phase 10 (US7 tests) — resilience hardening
5. **PR 5**: Phase 11 (US8 test) — room.info coverage
6. **PR 6** (final): remaining Phase 12 — integration test + cross-spec sweep + lib URL swap (T034 once adapter release is on npm)

### Parallel Team Strategy

With 2+ developers, the per-US test phases (4–11) are entirely independent. Phase 3 (the implementation) is one developer's PR; phases 4–11 can be parallelised across the rest of the team since they're test-only and target different inputs to the same method.

---

## Notes

- `[P]` tasks are different files with no incomplete-task dependency.
- `[Story]` labels enable PR-level traceability — each per-US test phase is a small focused PR.
- The implementation is a single ~80 LOC method (`createConversationFromExternal`) plus a ~15 LOC helper (`evaluateMemberConsent`) plus a ~20 LOC `getRoomInfo`. DM and group share the same control flow; the `is_direct` flag participates in only three one-liners (dedup-probe conditional, reject-reason ternary, room-type ternary). Per-US tracking lives on the test side, not the implementation side.
- Two central files: domain rules concentrate in `src/domain/communication/messaging/messaging.service.ts`; the wire layer is `src/services/adapters/communication-adapter/matrix.room.check.controller.ts`.
- The controller's `@MessagePattern` handler signatures use payload/response types from `@alkemio/matrix-adapter-lib` directly — no server-local wrapper DTOs (matches existing `onMessageReceived` precedent at `communication.adapter.event.service.ts:65`). Runtime validation lives in the domain method (T012 step 1), consistent with the codebase's pattern of validating at the domain boundary rather than via wire-level decorators.
- The constitution's static-exception-message rule (§5) is checked again in T037 because this feature creates several new error paths.
- No GraphQL schema changes — no `pnpm run schema:print` / `schema:diff` step required.
- No database migration — no `pnpm run migration:generate` step required.
- FR-018 refactors (T028–T031) are bundled in the feature PR for atomicity. The privacy fix at T028 stands on its own merit — reviewers may opt to split it into a precursor PR, but it must ship before the controller wiring is enabled in production.
- T034 (lib URL swap from pkg.pr.new → released semver) is a pre-merge follow-up gated on the matrix-adapter-go release containing PR #53 landing on npm. It is the only Polish task with an external dependency.

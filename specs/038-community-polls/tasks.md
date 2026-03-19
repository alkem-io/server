# Tasks: Community Polls & Voting

**Input**: Design documents from `specs/038-community-polls/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/schema.graphql ✅

**Tests**: Unit tests included for domain invariants (PollService validation, vote constraints) per constitution Principle 6 and plan.md directive — no full integration or e2e tests required.

**Organization**: Tasks grouped by user story; each phase is independently testable.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — different files, no incomplete task dependencies
- **[Story]**: User story this task belongs to (US1…US7 from spec.md)
- File paths follow `src/domain/collaboration/` conventions per plan.md

---

## Phase 1: Setup

**Purpose**: Locate existing files that will be modified; no new dependencies needed — NestJS, TypeORM, Apollo, and Vitest are already configured.

- [X] T001 Locate the existing `CalloutFramingType` enum file (e.g. `src/common/enums/callout.framing.type.ts` or equivalent) and confirm the `POLL` value addition does not break existing code; note the path for T024
- [X] T002 Locate the existing `NotificationEvent` enum file (e.g. `src/common/enums/notification.event.ts`) and confirm naming conventions for the 4 new poll event values; note the path for T055
- [X] T003 [P] Locate `src/domain/community/user-settings/user.settings.notification.space.interface.ts` (or equivalent interface/class holding `IUserSettingsNotificationSpaceBase`) and note the exact type used for channel fields; required for T056
- [X] T004 [P] Locate the `NotificationSpaceAdapter` in `src/services/adapters/notification-adapter/notification.space.adapter.ts` and confirm the method signature pattern (return type, DTO shape) used for existing callout-contribution notification methods; required for T059

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New enums, entity files, module skeletons, CalloutFraming modifications, and migration. All user story phases depend on this phase being complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Enums (fully parallel)

- [X] T005 [P] Create `src/common/enums/poll.status.ts` — export `enum PollStatus { OPEN = 'open', CLOSED = 'closed' }`
- [X] T006 [P] Create `src/common/enums/poll.results.visibility.ts` — export `enum PollResultsVisibility { HIDDEN = 'hidden', TOTAL_ONLY = 'total-only', VISIBLE = 'visible' }`
- [X] T007 [P] Create `src/common/enums/poll.results.detail.ts` — export `enum PollResultsDetail { PERCENTAGE = 'percentage', COUNT = 'count', FULL = 'full' }`

### Interfaces & ObjectTypes (parallel after T005–T007)

- [X] T008 [P] Create `src/domain/collaboration/poll/poll.settings.interface.ts` — `@ObjectType('PollSettings') abstract class IPollSettings` with `@Field` decorators for `minResponses: Int!`, `maxResponses: Int!`, `resultsVisibility: PollResultsVisibility!`, `resultsDetail: PollResultsDetail!`, `allowContributorsAddOptions: Boolean!` (all immutable, per data-model.md)
- [X] T009 [P] Create `src/domain/collaboration/poll/poll.interface.ts` — `@ObjectType('Poll') abstract class IPoll extends IAuthorizable` with fields: `title: String!`, `status: PollStatus!`, `settings: IPollSettings!`, `deadline: DateTime`, `totalVotes: Int`, `canSeeDetailedResults: Boolean!`, `options: [IPollOption!]!`, `myVote: IPollVote`; include internal `votes?: IPollVote[]` and `framing?: ICalloutFraming` (not exposed)
- [X] T010 [P] Create `src/domain/collaboration/poll-option/poll.option.interface.ts` — `@ObjectType('PollOption') abstract class IPollOption` with fields: `id: UUID!`, `createdDate: DateTime!`, `updatedDate: DateTime!`, `text: String!`, `sortOrder: Int!`, `voteCount: Int`, `votePercentage: Float`, `voters: [IUser!]`; nullable fields follow data-model.md visibility rules
- [X] T011 [P] Create `src/domain/collaboration/poll-vote/poll.vote.interface.ts` — `@ObjectType('PollVote') abstract class IPollVote extends IBaseAlkemio` with fields: `createdBy: UUID!`, `selectedOptions: [IPollOption!]!`; internal `poll?: IPoll`

### Entities (parallel after T005–T011)

- [X] T012 [P] Create `src/domain/collaboration/poll/poll.entity.ts` — `@Entity() class Poll extends AuthorizableEntity implements IPoll` with `@Column` for `title` (varchar 512), `status` (varchar ENUM_LENGTH, default OPEN), `settings` (jsonb, `IPollSettings`, immutable), `deadline` (timestamp, nullable); `@OneToMany` to `PollOption` (eager: false, cascade: true) and `PollVote` (eager: false, cascade: true); `@OneToOne` back-ref to `CalloutFraming`; no class-field defaults per project convention
- [X] T013 [P] Create `src/domain/collaboration/poll-option/poll.option.entity.ts` — `@Entity() class PollOption extends BaseAlkemioEntity implements IPollOption` with `@Column` for `text` (varchar MID_TEXT_LENGTH = 512, not null) and `sortOrder` (int, not null); `@ManyToOne` to `Poll` (eager: false, cascade: false, onDelete: CASCADE); UNIQUE `(pollId, sortOrder)` via `@Unique` decorator
- [X] T014 [P] Create `src/domain/collaboration/poll-vote/poll.vote.entity.ts` — `@Entity() class PollVote extends BaseAlkemioEntity implements IPollVote` with `@Column` for `createdBy` (uuid, not null; FK → user.id ON DELETE CASCADE) and `selectedOptionIds` (jsonb, string[], not null); `@ManyToOne` to `Poll` (eager: false, cascade: false, onDelete: CASCADE); UNIQUE `(createdBy, pollId)` via `@Unique` decorator (one vote per user per poll)

### Module skeletons (after entities + interfaces)

- [X] T015 ~~ELIMINATED~~ — `PollOptionService` is removed. The `PollOption` repository is injected directly into `PollService` (T019 already specifies this). No separate service layer is needed for options — all option operations (`addOption`, `updateOption`, `removeOption`, `reorderOptions`) live in `PollService`. **Skip this task.**
- [X] T016 ~~ELIMINATED~~ — `PollOptionModule` is removed. The `PollOption` entity is registered in `PollModule` (`TypeOrmModule.forFeature([Poll, PollOption])`). See T021. **Skip this task.**
- [X] T017 Create `src/domain/collaboration/poll-vote/poll.vote.service.ts` — stub `PollVoteService` class; inject `PollVote` repository; export class with two stubbed methods (implementations added in Phase 4): `castVote(pollId: string, voterId: string, selectedOptionIds: string[]): Promise<Poll>` and `getVoteForUser(pollId: string, userId: string): Promise<PollVote | null>` (called by T038 myVote field resolver)
- [X] T018 Create `src/domain/collaboration/poll-vote/poll.vote.module.ts` — `@Module` importing `TypeOrmModule.forFeature([PollVote])`, providing and exporting `PollVoteService`
- [X] T019 Create skeleton `src/domain/collaboration/poll/poll.service.ts` — `@Injectable() PollService` with constructor injecting `Poll` and `PollOption` repositories; all methods stubbed (throwing `NotImplementedException`) — implementations added per phase; explicitly include the following stubs so later tasks have clear anchors: `createPoll()` (T029), `getPollForFraming(framingId: string): Promise<Poll | null>` (called by T033 CalloutFraming field resolver), `computePollResults()` (T040), `applyVisibilityRules()` (T041), `canUserSeeDetailedResults()` (T042), `addOption()` (T049), `updateOption()` (T050), `removeOption()` (T051), `reorderOptions()` (T052), `getCalloutCreatorIdForPoll()` (T061)
- [X] T020 Create skeleton `src/domain/collaboration/poll/poll.service.authorization.ts` — `@Injectable() PollAuthorizationService`; stub `createAuthorizationPolicy()` and `applyAuthorizationRules()` methods. Also verify whether the codebase's base authorization pattern exposes a reusable `checkAuthorization(agentInfo, policy, privilege)` utility (likely in `src/core/authorization/` or a shared authorization service) — T037 and T053 will call this utility to enforce `CONTRIBUTE` and `UPDATE` privileges respectively; note the actual import path so later tasks use the correct symbol
- [X] T021 Create `src/domain/collaboration/poll/poll.module.ts` — `@Module` importing `TypeOrmModule.forFeature([Poll, PollOption])` (`PollOption` entity registered here — no separate `PollOptionModule`, see T015/T016), `PollVoteModule`; providing `PollService`, `PollAuthorizationService`, `PollMutationsResolver`, `PollFieldsResolver`; exporting `PollService`. (Resolver class names must match those used in T037/T053 for `PollMutationsResolver` and T038/T042–T046 for `PollFieldsResolver`.)

### CalloutFraming modifications

- [X] T022 Add `poll?: Poll` relation to `src/domain/collaboration/callout-framing/callout.framing.entity.ts`: `@OneToOne(() => Poll, poll => poll.framing, { eager: false, cascade: true, onDelete: 'SET NULL' }) @JoinColumn() poll?: Poll`
- [X] T023 Add `poll?: IPoll` to `src/domain/collaboration/callout-framing/callout.framing.interface.ts`
- [X] T024 Add `POLL` to the `CalloutFramingType` enum in the file identified in T001 (e.g. `POLL = 'poll'` alongside WHITEBOARD, LINK, MEMO, MEDIA_GALLERY, NONE)
- [X] T025 Import `PollModule` in `src/domain/collaboration/callout-framing/callout.framing.module.ts` imports array to resolve `PollService` dependency

### Migration

- [X] T026 Run `pnpm run migration:generate -n CommunityPolls` to generate `src/migrations/{TIMESTAMP}-CommunityPolls.ts`; verify the generated `up()` creates: `poll` table (id, createdDate, updatedDate, version, title varchar(512), status varchar(128) default 'open', settings jsonb NOT NULL, deadline timestamp NULL, authorizationId uuid FK); `poll_option` table (id, createdDate, updatedDate, version, text varchar(512), sortOrder int, pollId FK ON DELETE CASCADE, UNIQUE(pollId, sortOrder)); `poll_vote` table (id, createdDate, updatedDate, version, createdBy uuid FK → user(id) ON DELETE CASCADE, selectedOptionIds jsonb, pollId FK ON DELETE CASCADE, UNIQUE(createdBy, pollId)); `pollId` column added to `callout_framing` (uuid NULL, FK → poll(id) ON DELETE SET NULL); verify `down()` drops FK then tables in reverse order

**Checkpoint**: Foundation ready — all three new domain modules exist, CalloutFraming knows about Poll, migration is ready. User story phases can now begin.

---

## Phase 3: User Story 1 — Creating a Poll (Priority: P1) 🎯 MVP

**Goal**: Enable any user with Callout creation rights to create a Callout (Post) with an attached poll by extending `createCallout` — no separate mutation. Poll is immediately visible and open for voting.

**Independent Test**: A user with Callout creation rights can run the `createCalloutOnCalloutsSet` mutation with `framing.type = POLL` and `framing.poll = { options: ["A","B","C"] }` (title omitted), receive a response containing `framing.poll.id`, `framing.poll.status = OPEN`, `framing.poll.settings.minResponses = 1`, `framing.poll.settings.maxResponses = 1`, and three options each with `voteCount = null` (results visible by default). Attempting to create with fewer than 2 options returns a validation error.

### Implementation

- [X] T027 [P] [US1] Create `PollSettingsInput` input DTO in `src/domain/collaboration/poll/dto/poll.dto.create.ts`: decorate with `@InputType('PollSettingsInput')` to match the schema contract; optional fields `minResponses?: Int` (default 1), `maxResponses?: Int` (default 1), `resultsVisibility?: PollResultsVisibility` (default VISIBLE), `resultsDetail?: PollResultsDetail` (default FULL), `allowContributorsAddOptions?: Boolean` (default false); use `@IsOptional()`, `@IsInt()`, and `@IsBoolean()` validators
- [X] T028 [P] [US1] Create `CreatePollInput` input DTO in `src/domain/collaboration/poll/dto/poll.dto.create.ts`: optional `title?: String` (max 512 chars, `@MaxLength(MID_TEXT_LENGTH)` when provided), optional `settings?: PollSettingsInput`, required `options: [String!]!` (each max 512 chars, `@ArrayMinSize(2)`)
- [X] T029 [US1] Implement `PollService.createPoll(input: CreatePollInput): Promise<{ poll: Poll; warnings: string[] }>` in `src/domain/collaboration/poll/poll.service.ts`: (1) validate `options.length >= 2`; (2) validate `minResponses >= 1`; (3) validate `maxResponses >= 0`; (4) when `maxResponses > 0` validate `maxResponses >= minResponses`; (5) detect duplicate option texts — if any two options share the same case-insensitive text, add `"Poll contains duplicate option text"` to a `warnings` array (creation proceeds regardless); (6) create `Poll` entity with `title = input.title ?? ''`, `status = OPEN`, `deadline = null`, settings object with resolved defaults; (7) create one `PollOption` entity per option text with sequential `sortOrder` starting at 1; (8) persist via repository; return `{ poll, warnings }`. In the `createCallout` resolver (T032 caller), if `warnings` is non-empty, surface each warning via Apollo response extensions (e.g. `context.res.extensions = { warnings }`) so the GraphQL response includes a warnings array alongside the data — spec requires the warning to appear in the response without blocking creation.
- [X] T030 [US1] Implement `PollAuthorizationService.createAuthorizationPolicy()` in `src/domain/collaboration/poll/poll.service.authorization.ts`: create a new `AuthorizationPolicy` for the `Poll`; inherit `READ` from parent `CalloutFraming` policy; grant `CONTRIBUTE` to space members (matching how existing callout contributions are granted); grant `UPDATE` to Callout editors (facilitators, admins)
- [X] T031 [US1] Add `poll?: CreatePollInput` field to `CreateCalloutFramingInput` in `src/domain/collaboration/callout-framing/dto/callout.framing.dto.create.ts`: mark `@IsOptional()`; no `@ValidateNested()` needed unless other input fields require it
- [X] T032 [US1] Implement `CalloutFramingService.createPollOnFraming()` in `src/domain/collaboration/callout-framing/callout.framing.service.ts`: (0) **guard**: in `createCalloutFraming()`, when `input.type === CalloutFramingType.POLL` and `input.poll` is `undefined`/`null`, throw a `ValidationException('Poll input is required when framing type is POLL', LogContext.COLLABORATION)` before proceeding — do not silently create a framing with a missing poll; (1) call `PollService.createPoll(input.poll)` (receives `{ poll, warnings }`); (2) call `PollAuthorizationService.createAuthorizationPolicy()`; (3) set `framing.poll = poll` before persisting; (4) **verify** that the existing `createCallout` mutation in `callout.resolver.mutations.ts` delegates `framing` input fully to `calloutFramingService.createCalloutFraming()` without stripping the `poll` field — if any input transformation exists in that resolver, ensure `poll` is passed through; update the resolver if needed (plan.md lists this file as modified)
- [X] T033 [US1] Add `poll` field resolver for `CalloutFraming` type in `callout.framing.resolver.fields.ts`: annotate with `@ResolveField(() => IPoll, { nullable: true })`; load `Poll` via `PollService.getPollForFraming(framingId)`.
- [X] T034 [US1] Add unit tests for `createPoll()` invariants in `src/domain/collaboration/poll/poll.service.spec.ts`: (a) rejects input with fewer than 2 options; (b) rejects `minResponses < 1`; (c) rejects `maxResponses < 0`; (d) rejects `maxResponses > 0 && maxResponses < minResponses`; (e) applies default settings when `settings` is omitted; (e2) allows omitted `title` and persists an empty-string title; (f) assigns sequential `sortOrder` starting at 1; (g) returns `warnings` containing the duplicate-text message when two options share the same text, but still creates the poll successfully (FR edge case); (h) newly created poll has `status = OPEN` (FR-023); (i) newly created poll has `deadline = null` (FR-027). Add one test for the framing guard in `src/domain/collaboration/callout-framing/callout.framing.service.spec.ts`: (j) `createCalloutFraming()` throws `ValidationException` when `input.type === POLL` and `input.poll` is undefined

**Checkpoint**: A poll can be created and read. `createCallout` with `framing.type = POLL` returns the poll with all static fields. Validation errors fire correctly.

---

## Phase 4: User Story 2 & User Story 4 — Voting & Changing a Vote (Priority: P2 / P4)

**Goal (US2)**: Space members can cast a vote on an open poll by calling `castPollVote`. The vote is recorded, results update immediately.

**Goal (US4)**: Members who already voted can call `castPollVote` again with a new complete selection set; their previous vote is replaced entirely. Old selection loses votes, new selection gains votes.

**Independent Test**: (US2) A member calls `castPollVote({ pollID, selectedOptionIDs: [optionA] })`; the returned `Poll.options` shows `optionA.voteCount = 1` and `Poll.myVote.selectedOptions` contains `optionA`. (US4) The same member calls `castPollVote({ pollID, selectedOptionIDs: [optionB] })`; the returned poll shows `optionA.voteCount = 0`, `optionB.voteCount = 1`, and `myVote.selectedOptions` now contains only `optionB`. Non-members receive an authorization error.

### Implementation

- [X] T035 [P] [US2] Create `CastPollVoteInput` input DTO in `src/domain/collaboration/poll-vote/dto/poll.vote.dto.cast.ts`: `pollID: UUID!` and `selectedOptionIDs: [UUID!]!` (both required; `@IsUUID()` on each element via `@each` validator)
- [X] T036 [US2] Implement `PollVoteService.castVote(pollId: string, voterId: string, selectedOptionIds: string[]): Promise<Poll>` in `src/domain/collaboration/poll-vote/poll.vote.service.ts`: (1) load `Poll` with options; (2) validate all `selectedOptionIds` exist in `poll.options` and belong to this poll — reject any unknown or cross-poll IDs; (3) validate no duplicate IDs within the submission; (4) validate `selectedOptionIds.length >= poll.settings.minResponses`; (5) when `poll.settings.maxResponses > 0` validate `selectedOptionIds.length <= poll.settings.maxResponses`; (6) upsert: if a `PollVote` row exists for `(voterId, pollId)` update `selectedOptionIds` entirely (full replacement); otherwise insert new `PollVote`; (7) return updated `Poll` (for field resolvers to compute results)
- [X] T037 [US2] Create `castPollVote` mutation in `src/domain/collaboration/poll/poll.resolver.mutations.ts`: `@Mutation(() => IPoll) castPollVote(@Args('voteData') voteData: CastPollVoteInput, @CurrentUser() user: AgentInfo): Promise<IPoll>`; enforce `CONTRIBUTE` privilege on `Poll` via `PollAuthorizationService.checkAuthorization()`; call `PollVoteService.castVote(voteData.pollID, user.userID, voteData.selectedOptionIDs)`; return updated `Poll`
- [X] T038 [US2] Add `myVote` field resolver on `Poll` in `src/domain/collaboration/poll/poll.resolver.fields.ts`: `@ResolveField(() => IPollVote, { nullable: true })`; load the `PollVote` record for the current user and this poll from `PollVoteService.getVoteForUser(pollId, userId)`; if found, resolve `selectedOptions` by cross-referencing `selectedOptionIds` with `poll.options` (already in context); return `null` if user has not voted
- [X] T039 [US2] Add unit tests in `src/domain/collaboration/poll-vote/poll.vote.service.spec.ts` for `castVote()` invariants: (a) rejects option ID from a different poll; (b) rejects duplicate option IDs within the submission; (c) rejects `selectedOptionIds.length < minResponses`; (d) rejects `selectedOptionIds.length > maxResponses` when `maxResponses > 0`; (e) rejects empty selection array; (f) inserts new `PollVote` on first call; (g) fully replaces `selectedOptionIds` on second call (US4 branch); (h) result of (g) shows old option loses vote, new option gains vote

**Checkpoint**: Members can cast and update votes. `castPollVote` is idempotent in the sense that each call replaces the full vote. US2 and US4 are both covered by this mutation.

---

## Phase 4b: User Story 4 — Vote Removal (Priority: P4) 🔄 FR-012a/b Implementation

**Goal (US4 Branch)**: Voters can remove their vote entirely via `removePollVote(pollID)`, returning the poll to an unvoted state. Vote removal is silent (no notifications per FR-020a/b clarification) but `pollVoteUpdated` subscription fires so real-time viewers see updated counts.

**Independent Test**: A member who has voted calls `removePollVote(pollID)`; the returned `Poll.myVote` is `null`, all `options[].voteCount` are decremented by 1 for options that member had selected. A member who has not voted calls `removePollVote(pollID)` and receives a validation error "You have not voted on this poll".

### Implementation

- [X] T039a [P] [US4] Create `RemovePollVoteInput` input DTO in `src/domain/collaboration/poll-vote/dto/poll.vote.dto.remove.ts`: single required field `pollID: UUID!` (with `@IsUUID()` validator)
- [X] T039b [US4] Implement `PollVoteService.removeVote(pollId: string, voterId: string): Promise<Poll>` in `src/domain/collaboration/poll-vote/poll.vote.service.ts`: (1) load `Poll` with options; (2) find `PollVote` record for `(voterId, pollId)` — if not found, throw `ValidationException('You have not voted on this poll', LogContext.COLLABORATION)`; (3) delete the `PollVote` record; (4) return updated `Poll` (for field resolvers to compute results with decremented counts). **No notifications dispatched** (per FR-020a/b: vote removal is silent). (notification hook placeholder, Phase 9 only: `// TODO US7: publish PollVoteUpdatedSubscriptionPayload after vote removal`)
- [X] T039c [US4] Create `removePollVote` mutation in `src/domain/collaboration/poll/poll.resolver.mutations.ts`: `@Mutation(() => IPoll) removePollVote(@Args('voteData') voteData: RemovePollVoteInput, @CurrentUser() user: AgentInfo): Promise<IPoll>`; enforce `CONTRIBUTE` privilege on `Poll` via `PollAuthorizationService.checkAuthorization()`; call `PollVoteService.removeVote(voteData.pollID, user.userID)`; return updated `Poll`
- [X] T039d [US4] Wire subscription publish in `removePollVote` mutation (Phase 9 forward-reference): after vote removal, add a TODO placeholder: `// TODO US7: call subscriptionPublishService.publishPollVoteUpdated(payload)` — implementation deferred to Phase 9 (T086)
- [X] T039e [US4] Add unit tests in `src/domain/collaboration/poll-vote/poll.vote.service.spec.ts` for `removeVote()`: (a) removes existing vote and returns updated poll with decremented counts; (b) throws `ValidationException` when voter has not voted; (c) after removal, subsequent call to `getVoteForUser()` returns `null`; (d) double-removal error: after first `removeVote()` succeeds, second `removeVote()` in rapid succession throws validation error (ensures idempotency guard); (e) verify `myVote` field resolver returns `null` after removal (integration between T039a–d and T038)

**Checkpoint**: Vote removal works end-to-end. Mutations enforce authorization. Validation errors fire on missing votes. Results update correctly with decremented counts. Real-time subscribers will see updates once Phase 9 subscriptions are wired.

---

## Phase 5: User Story 3 — Viewing Results with Vote Transparency (Priority: P3)

**Goal**: Any space member can view poll results at any time (results update on page load). Options are always returned in `sortOrder` (ascending). Visibility is governed by `settings.resultsVisibility` and `settings.resultsDetail`.

**Independent Test**: After US2 votes are cast, any member (including non-voters when `resultsVisibility = VISIBLE`) queries `callout.framing.poll { options { text voteCount votePercentage voters { id } } totalVotes canSeeDetailedResults }`. Options are returned in ascending `sortOrder` order. With `resultsDetail = FULL`, `voters` contains the voter's `IUser`. With `resultsDetail = COUNT`, `voters` is null. With `resultsVisibility = HIDDEN` and user has not voted, all result fields are null.

### Implementation

- [X] T040 [US3] Implement `PollService.computePollResults(poll: Poll, currentUserId: string, hasVoted: boolean): EnrichedPollOptions` in `src/domain/collaboration/poll/poll.service.ts`: (1) load all `PollVote` rows for the poll; (2) build `Map<optionId, PollVote[]>` in memory; (3) compute `totalVotes = PollVote.length`; (4) for each option compute `voteCount = votesForOption.length` and `votePercentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : null`; (5) always return options sorted by `sortOrder ASC` (FR-015); (6) set `voterIds = votesForOption.map(v => v.createdBy)` (used by voters field resolver). **`applyVisibilityRules()` (T041) subsequently nulls out field values but does NOT alter sort order.**
- [X] T041 [US3] Implement server-side visibility/detail filtering in `PollService.applyVisibilityRules()` in `src/domain/collaboration/poll/poll.service.ts`: apply the 6-cell matrix from data-model.md — `resultsVisibility × hasVoted` determines whether to return `totalVotes`, `voteCount`, `votePercentage`, and `voterIds`; `resultsDetail` further nulls out fields per rule (PERCENTAGE nulls voteCount+voters; COUNT nulls votePercentage+voters; FULL returns all); result: each enriched option has correct fields set to `null` or value per the matrix. **This method nulls out field values only — it does NOT change option sort order. Sort order was already determined by `computePollResults()` (T040) based on the visibility gate.**
- [X] T042 [US3] Implement `Poll.canSeeDetailedResults` derived field: `true` when the current user has a `PollVote` record for this poll OR `settings.resultsVisibility === VISIBLE`; compute in `PollService.canUserSeeDetailedResults(poll, userId)` and expose via `@ResolveField(() => Boolean)` in `src/domain/collaboration/poll/poll.resolver.fields.ts`
- [X] T043 [US3] Add `Poll.options` field resolver in `src/domain/collaboration/poll/poll.resolver.fields.ts`: `@ResolveField(() => [IPollOption])` — determine `hasVoted` by checking `PollVoteService.getVoteForUser(pollId, userId) !== null`; call `PollService.computePollResults(poll, userId, hasVoted)` (passes `hasVoted` so the sort order is set correctly for the HIDDEN+not-voted case per T040) then `PollService.applyVisibilityRules()`; return enriched, sorted `IPollOption[]`
- [X] T044 [US3] Add `Poll.totalVotes` field resolver in `src/domain/collaboration/poll/poll.resolver.fields.ts`: return `totalVotes` from results computation per the data-model.md 6-cell visibility matrix — `HIDDEN + not voted → null`; `HIDDEN + voted → value`; `TOTAL_ONLY + not voted → value` (total count is the one thing revealed before voting in TOTAL_ONLY mode); `TOTAL_ONLY + voted → value`; `VISIBLE + either → value`. Note: `TOTAL_ONLY` reveals the aggregate count but no per-option breakdown — totalVotes is the only non-null result field in that state when the user has not voted.
- [X] T045 [US3] Implement DataLoader for voter identity resolution — reuses existing `UserLoaderCreator` from `@core/dataloader/creators/loader.creators/user.loader.creator` (already globally registered in `LoaderCreatorModule`); no new file needed: batch-load `IUser` objects by array of `createdBy` UUIDs using a single user-service query; register as a request-scoped DataLoader in the NestJS module; use in `PollOption.voters` `@ResolveField` resolver to avoid N+1 when multiple options each have voter lists
- [X] T046 [US3] Add `PollOption.voters` field resolver using the DataLoader from T045 — created `src/domain/collaboration/poll-option/poll.option.resolver.fields.ts` with `@Resolver(() => IPollOption)` using `@Loader(UserLoaderCreator)`; registered in `PollModule`: when `voterIds` is non-null (per visibility rules), call `dataLoader.loadMany(voterIds)` and return resolved `IUser[]`; return `null` otherwise
- [X] T047 [US3] Add unit tests in `src/domain/collaboration/poll/poll.service.spec.ts` for results computation and visibility: (a) options are always returned in `sortOrder ASC` (regardless of vote counts); (b) `HIDDEN + not voted` nulls all result fields and keeps `sortOrder ASC`; (c) `HIDDEN + voted` shows full results and keeps `sortOrder ASC`; (d) `TOTAL_ONLY + not voted` shows only `totalVotes`; (e) `VISIBLE` shows results and keeps `sortOrder ASC`; (f) `resultsDetail = PERCENTAGE` nulls `voteCount` and `voters`; (g) `resultsDetail = COUNT` nulls `votePercentage` and `voters`; (h) `votePercentage = null` when `totalVotes = 0`

**Checkpoint**: Poll results are correctly ranked, visibility-gated, and detail-filtered. Any space member can view results according to poll settings.

---

## Phase 6: User Story 5 — Editing Poll Options (Priority: P5)

**Goal**: Users with Callout edit permissions can add options, update option text (deletes affected votes + notifies voters), remove options with minimum-options guard (deletes affected votes + notifies voters), and reorder options. All changes are immediately visible.

**Independent Test**: (add) After US1 creates a 3-option poll, calling `addPollOption({ pollID, text: "Thursday" })` returns a poll with 4 options and the new option has `sortOrder = 4`. (remove) Calling `removePollOption` on an option with 2 remaining would return a validation error. (reorder) Calling `reorderPollOptions` with a list containing an extra ID returns a domain error. (update) Calling `updatePollOption` on an option that a user voted for removes that user's vote (verified by `poll.options` showing `voteCount` reduced).

*Note*: Full notification delivery for these mutations is wired in Phase 7 (US6). The mutations complete correctly without notifications until US6 is integrated.

### Implementation

- [X] T048 [P] [US5] Create `AddPollOptionInput`, `UpdatePollOptionInput`, `RemovePollOptionInput`, `ReorderPollOptionsInput` DTOs in `src/domain/collaboration/poll/dto/poll.dto.option.ts`:
  - `AddPollOptionInput`: `pollID: UUID!`, `text: String!` (max 512 chars)
  - `UpdatePollOptionInput`: `pollID: UUID!`, `optionID: UUID!`, `text: String!` (max 512 chars)
  - `RemovePollOptionInput`: `pollID: UUID!`, `optionID: UUID!`
  - `ReorderPollOptionsInput`: `pollID: UUID!`, `optionIDs: [UUID!]!`
- [X] T049 [US5] Implement `PollService.addOption(pollId, text): Promise<Poll>` in `src/domain/collaboration/poll/poll.service.ts`: create new `PollOption` with `sortOrder = max(existingOptions.sortOrder) + 1`; persist; return updated `Poll` (notification hook placeholder: `// TODO US6: dispatch SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON to all existing voters`)
- [X] T050 [US5] Implement `PollService.updateOption(pollId, optionId, newText): Promise<{ poll: Poll; deletedVoterIds: string[] }>` in `src/domain/collaboration/poll/poll.service.ts`: (1) load all `PollVote` rows where `selectedOptionIds` contains `optionId` (JSONB `@>` containment query); (2) delete those `PollVote` rows entirely; (3) update `poll_option.text` and set `updatedDate`; (4) return updated `Poll` and list of `deletedVoterIds` (for notification dispatch in US6) (notification hook placeholder: `// TODO US6: dispatch VOTE_AFFECTED_BY_OPTION_CHANGE to deletedVoterIds and POLL_MODIFIED to remaining voters`)
- [X] T051 [US5] Implement `PollService.removeOption(pollId, optionId): Promise<{ poll: Poll; deletedVoterIds: string[] }>` in `src/domain/collaboration/poll/poll.service.ts`: (1) enforce minimum-options guard: count current options; if count ≤ 2 throw validation error "Poll must retain at least 2 options"; (2) load and delete all `PollVote` rows containing `optionId`; (3) delete `poll_option` row; (4) re-sequence `sortOrder` for remaining options (sequential 1, 2, 3…) in a transaction; (5) return updated `Poll` and `deletedVoterIds` (notification hook placeholder: `// TODO US6: dispatch VOTE_AFFECTED_BY_OPTION_CHANGE to deletedVoterIds; dispatch POLL_MODIFIED_ON_POLL_I_VOTED_ON to remaining voters (all PollVote.createdBy for this poll minus deletedVoterIds)`)
- [X] T052 [US5] Implement `PollService.reorderOptions(pollId, orderedOptionIds: string[]): Promise<Poll>` in `src/domain/collaboration/poll/poll.service.ts`: (1) validate `orderedOptionIds` contains exactly the same set of IDs as current `poll.options` (no additions, no omissions — symmetric diff must be empty); (2) two-pass update in a transaction: Pass 1 — assign temp negative `sortOrder` values (`-1, -2, -3…`) to all options to avoid the UNIQUE `(pollId, sortOrder)` constraint; Pass 2 — assign final sequential values (`1, 2, 3…`) per `orderedOptionIds`; (3) return updated `Poll` (notification hook placeholder: `// TODO US6: dispatch POLL_MODIFIED to all voters`)
- [X] T053 [US5] Add `addPollOption`, `updatePollOption`, `removePollOption`, `reorderPollOptions` mutations to `src/domain/collaboration/poll/poll.resolver.mutations.ts`: `addPollOption` allows UPDATE privilege OR (CONTRIBUTE privilege when `settings.allowContributorsAddOptions` is true — FR-004a); `updatePollOption`, `removePollOption`, `reorderPollOptions` enforce UPDATE privilege only; each returns `Poll!` (the updated poll including enriched options)
- [X] T054 [US5] Add unit tests in `src/domain/collaboration/poll/poll.service.spec.ts` for option management: (a) `removeOption` rejects when poll has exactly 2 options; (b) `removeOption` deletes affected `PollVote` rows and returns their voter IDs; (c) `reorderOptions` rejects mismatched ID list (missing ID, extra ID); (d) `reorderOptions` two-pass update preserves vote counts; (e) `updateOption` deletes all votes containing the target option; (f) `addOption` assigns `sortOrder = max + 1`

**Checkpoint**: All four option-management mutations work. Vote cleanup on option removal/edit is correct. Notifications are stubbed but not yet dispatched.


## Phase 7: User Story 6 — Callout Creator & Voter Notifications (Priority: P6)

**Goal**: Four notification events are delivered via the existing dual-channel notification infrastructure: (1) creator notified on every vote; (2) existing voters notified when another vote is cast; (3) voters notified when their vote is deleted by option change; (4) unaffected voters notified when poll is modified.

**Independent Test**: After US2 casts vote as Member B, Member A (Callout creator) receives an in-app notification with event type `SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL`. When Member A updates poll option text that Member B voted for, Member B receives `SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE`. Member A does not receive a notification when voting on their own poll.

*Note*: US6 completes the notification hooks introduced as `// TODO US6` comments in US2 (T037) and US5 (T049–T052).

### Infrastructure (parallel, no inter-dependencies)

- [X] T055 [P] [US6] Add 4 new values to `NotificationEvent` enum in the file identified in T002: `SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL`, `SPACE_COLLABORATION_POLL_VOTE_CAST_ON_POLL_I_VOTED_ON`, `SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON`, `SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE`
- [X] T056 [P] [US6] Add 4 preference fields to `IUserSettingsNotificationSpaceBase` interface in `src/domain/community/user-settings/user.settings.notification.space.interface.ts`: `collaborationPollVoteCastOnOwnPoll`, `collaborationPollVoteCastOnPollIVotedOn`, `collaborationPollModifiedOnPollIVotedOn`, `collaborationPollVoteAffectedByOptionChange` — all typed as `IUserSettingsNotificationChannels!`; use same field type as existing `collaborationCalloutContribution` or equivalent peer field
- [X] T057 [P] [US6] Create 4 notification input DTO files in `src/services/adapters/notification-adapter/dto/space/`:
  - `notification.dto.input.space.collaboration.poll.vote.cast.on.own.poll.ts`
  - `notification.dto.input.space.collaboration.poll.vote.cast.on.poll.i.voted.on.ts`
  - `notification.dto.input.space.collaboration.poll.modified.on.poll.i.voted.on.ts`
  - `notification.dto.input.space.collaboration.poll.vote.affected.by.option.change.ts`
  Each DTO contains `spaceID`, `calloutID`, `pollID`, `triggeredByUserID`, and any event-specific fields; model after the existing `NotificationCalloutContributionCreated` DTO pattern
- [X] T058 [P] [US6] Create in-app notification payload DTO in `src/platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.poll.ts` — follow the pattern of existing in-app payload DTOs for callout events

### Adapter & Recipients (after T055–T058)

- [X] T059 [US6] Add 4 notification dispatch methods to `NotificationSpaceAdapter` in `src/services/adapters/notification-adapter/notification.space.adapter.ts`:
  - `spaceCollaborationPollVoteCastOnOwnPoll(dto)` → `NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL`
  - `spaceCollaborationPollVoteCastOnPollIVotedOn(dto)` → `SPACE_COLLABORATION_POLL_VOTE_CAST_ON_POLL_I_VOTED_ON`
  - `spaceCollaborationPollModifiedOnPollIVotedOn(dto)` → `SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON`
  - `spaceCollaborationPollVoteAffectedByOptionChange(dto)` → `SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE`
- [X] T060 [US6] Add poll notification recipient resolution cases in `src/services/api/notification-recipients/notification.recipients.service.ts`:
  - **(a) `SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL`** — recipient is the Callout creator. The creator's user ID is resolved **before the DTO is built** (in T061, inside `PollVoteService.castVote()`) via a 3-step join: `pollId → poll.framing → framing.callout → callout.createdBy`. Concretely: load the Poll with `relations: { framing: { callout: true } }` and `select: { id: true, framing: { id: true, callout: { id: true, createdBy: true } } }`; expose this as a helper method `PollService.getCalloutCreatorIdForPoll(pollId: string): Promise<string>`. The resolved `createdBy` UUID is placed in the DTO's `userID` field. In the recipients service, handle this event with `credentialCriteria = this.getUserSelfCriteria(userID)` — same pattern as `SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT`.
  - **(b) `SPACE_COLLABORATION_POLL_VOTE_CAST_ON_POLL_I_VOTED_ON`** — recipients are all prior voters. Load all `PollVote.createdBy` for the poll (already in memory from the castVote flow); exclude the current voter's ID. Pass each recipient ID individually or as a list; dispatch one notification per recipient using `getUserSelfCriteria(recipientId)`.
  - **(c) `SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE`** — recipients are the `deletedVoterIds` list returned by `PollService.updateOption()` or `PollService.removeOption()`. Dispatch one notification per ID using `getUserSelfCriteria(recipientId)`.
  - **(d) `SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON`** — recipients are all current voters, excluding any in the `deletedVoterIds` set. Load all `PollVote.createdBy` for the poll; subtract `deletedVoterIds`; dispatch one notification per remaining ID using `getUserSelfCriteria(recipientId)`.

### Notification wiring (after T059–T060)

- [X] T061 [US6] Wire notification dispatch in `PollVoteService.castVote()` (from T036): after vote persist — (1) call `PollService.getCalloutCreatorIdForPoll(pollId)` (see T060a) to resolve the creator; if creator ≠ current voter, dispatch `spaceCollaborationPollVoteCastOnOwnPoll` with `userID = creatorId` (FR-022 self-notification exclusion); set `creatorNotified = (creator !== currentVoter)`; (2) from the votes already loaded in step (1) of castVote, collect prior voter IDs, exclude current voter, **and exclude `creatorId` when `creatorNotified = true`** (FR-020b dedup: when FR-020a was dispatched to the creator, the creator MUST NOT also receive FR-020b for the same event — FR-020a takes precedence), dispatch `spaceCollaborationPollVoteCastOnPollIVotedOn` per remaining recipient
- [X] T062 [US6] Wire `SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON` in `PollService.addOption()` and `PollService.reorderOptions()` (from T049, T052): after persist, load current voter IDs and dispatch `spaceCollaborationPollModifiedOnPollIVotedOn` to each
- [X] T063 [US6] Wire dual-notification in `PollService.updateOption()` (from T050): (1) dispatch `spaceCollaborationPollVoteAffectedByOptionChange` to `deletedVoterIds`; (2) dispatch `spaceCollaborationPollModifiedOnPollIVotedOn` to remaining voters whose vote was not deleted (all voters minus `deletedVoterIds`)
- [X] T064 [US6] Wire dual notifications in `PollService.removeOption()` (from T051): (1) dispatch `spaceCollaborationPollVoteAffectedByOptionChange` to `deletedVoterIds`; (2) load all current `PollVote.createdBy` for the poll (after deletion), subtract `deletedVoterIds`, dispatch `spaceCollaborationPollModifiedOnPollIVotedOn` to each remaining voter — mirrors the dual-dispatch pattern in T063 (`updateOption`) and satisfies FR-020d ("options removed where the recipient did not vote for the removed option" triggers `collaborationPollModifiedOnPollIVotedOn`)
- [X] T065 [US6] Add unit tests in `src/services/api/notification-recipients/notification.recipients.service.spec.ts` for poll recipient resolution: (a) self-notification exclusion for creator-is-voter case (FR-022: creator votes on own poll → no FR-020a dispatched); (b) empty prior-voters list produces no notification dispatch; (c) `POLL_VOTE_CAST_ON_POLL_I_VOTED_ON` excludes the current voter from recipient list; (d) `POLL_MODIFIED` excludes voters in the `deletedVoterIds` set; **(e) `removePollOption` dual-dispatch: when option is removed with 2 affected voters and 3 unaffected voters, `VOTE_AFFECTED_BY_OPTION_CHANGE` is dispatched to the 2 affected voters and `POLL_MODIFIED_ON_POLL_I_VOTED_ON` is dispatched to the 3 unaffected voters (H1 coverage)**; **(f) creator-voted dedup (H2): when the Callout creator has previously voted on the poll and Member B casts a new vote — creator receives `POLL_VOTE_CAST_ON_OWN_POLL` (FR-020a) and is NOT included in the `POLL_VOTE_CAST_ON_POLL_I_VOTED_ON` (FR-020b) recipient list for that same event**

**Checkpoint**: All four notification events fire with correct recipients. Self-notification is suppressed. Voter notifications fire on option removal and text edit.

---

## Phase 9: User Story 7 — Real-Time Subscriptions (P7) (added after phase 8 bellow)

**Goal**: Two GraphQL subscriptions (`pollVoteUpdated`, `pollOptionsChanged`) push live poll state to connected clients using the platform's existing PubSub infrastructure. No new infrastructure — follows `calloutPostCreated` / `virtualContributorUpdated` patterns.

**Independent Test**: Subscribe to `pollVoteUpdated(pollID)` with two browser sessions. Member A casts a vote; Member B's subscription receives the updated poll with results filtered by B's visibility context. When `resultsVisibility = HIDDEN` and Member C has not voted, Member C receives no event. Subscribe to `pollOptionsChanged(pollID)`; admin adds an option; all subscribers receive the updated option list.

### Infrastructure (parallel, no inter-dependencies)

- [X] T074 [P] [US7] Create `PollEventType` enum in `src/common/enums/poll.event.type.ts` with values `POLL_VOTE_UPDATED = 'POLL_VOTE_UPDATED'`, `POLL_OPTIONS_CHANGED = 'POLL_OPTIONS_CHANGED'`, and `POLL_STATUS_CHANGED = 'POLL_STATUS_CHANGED'`; register with `registerEnumType`. Export from `src/common/enums/index.ts`.
- [X] T075 [P] [US7] Add two values to `SubscriptionType` enum in `src/common/enums/subscription.type.ts`: `POLL_VOTE_UPDATED = 'pollVoteUpdated'` and `POLL_OPTIONS_CHANGED = 'pollOptionsChanged'`.
- [X] T076 [P] [US7] Add two Symbol constants to `src/common/constants/providers.ts`: `SUBSCRIPTION_POLL_VOTE_UPDATED` and `SUBSCRIPTION_POLL_OPTIONS_CHANGED`.

### Payload & DTO (after T074–T076)

- [X] T077 [P] [US7] Create subscription payload interface `PollVoteUpdatedSubscriptionPayload` in `src/services/subscriptions/subscription-service/dto/poll.vote.updated.subscription.payload.ts` — extends `BaseSubscriptionPayload` with fields `pollEventType: PollEventType`, `pollID: string`, `poll: IPoll`.
- [X] T078 [P] [US7] Create subscription payload interface `PollOptionsChangedSubscriptionPayload` in `src/services/subscriptions/subscription-service/dto/poll.options.changed.subscription.payload.ts` — extends `BaseSubscriptionPayload` with fields `pollEventType: PollEventType`, `pollID: string`, `poll: IPoll`.
- [X] T079 [P] [US7] Create `PollVoteUpdatedSubscriptionResult` ObjectType in `src/domain/collaboration/poll/dto/poll.vote.updated.subscription.result.ts` — fields: `pollEventType: PollEventType`, `poll: IPoll` (non-nullable). Follow `VirtualContributorUpdatedSubscriptionResult` pattern.
- [X] T080 [P] [US7] Create `PollOptionsChangedSubscriptionResult` ObjectType in `src/domain/collaboration/poll/dto/poll.options.changed.subscription.result.ts` — fields: `pollEventType: PollEventType`, `poll: IPoll` (non-nullable). Same pattern as T079.
- [X] T081 [P] [US7] Create `PollSubscriptionArgs` ArgsType in `src/domain/collaboration/poll/dto/poll.subscription.args.ts` — single field `pollID: UUID!` with `@MaxLength(UUID_LENGTH)`.

### Service Methods (after T076)

- [X] T082 [US7] Add `subscribeToVoteUpdated(pollID: string): Promise<AsyncIterableIterator<PollVoteUpdatedSubscriptionPayload>>` method to `SubscriptionReadService` — injects `SUBSCRIPTION_POLL_VOTE_UPDATED` PubSubEngine, returns `asyncIterator(pollID)`. Follow `subscribeToVirtualContributorUpdated` pattern.
- [X] T083 [US7] Add `subscribeToOptionsChanged(pollID: string): Promise<AsyncIterableIterator<PollOptionsChangedSubscriptionPayload>>` method to `SubscriptionReadService` — injects `SUBSCRIPTION_POLL_OPTIONS_CHANGED` PubSubEngine, returns `asyncIterator(pollID)`.
- [X] T084 [US7] Add `publishPollVoteUpdated(payload: PollVoteUpdatedSubscriptionPayload): Promise<void>` to `SubscriptionPublishService` — publishes to `SUBSCRIPTION_POLL_VOTE_UPDATED` engine using `payload.pollID` as topic. Add `publishPollOptionsChanged(payload: PollOptionsChangedSubscriptionPayload): Promise<void>` — publishes to `SUBSCRIPTION_POLL_OPTIONS_CHANGED`.

### Subscription Resolver (after T079–T084)

- [X] T085 [US7] Create `PollResolverSubscriptions` in `src/domain/collaboration/poll/poll.resolver.subscriptions.ts`:
  - `pollVoteUpdated(args: PollSubscriptionArgs)` — uses `@TypedSubscription` decorator with `subscribe` → `subscriptionReadService.subscribeToVoteUpdated(args.pollID)`, `filter` → matches `payload.pollID === args.pollID`; for `HIDDEN` visibility with non-voted subscriber → return false (suppress event); `resolve` → returns `PollVoteUpdatedSubscriptionResult` with `pollEventType` and `poll` entity (field resolvers handle per-subscriber visibility).
  - `pollOptionsChanged(args: PollSubscriptionArgs)` — same pattern with `subscribeToOptionsChanged`, no HIDDEN suppression (option events always delivered); `resolve` → returns `PollOptionsChangedSubscriptionResult`.
  - Inject `PollVoteService` for voter-status check in filter.

### Mutation Wiring (after T084)

- [X] T086 [US7] Wire publish calls in `poll.resolver.mutations.ts`:
  - `castPollVote` → after vote persist, publish `PollSubscriptionPayload` with `pollEventType = POLL_VOTE_UPDATED`.
  - `removePollVote` → after vote removal, publish `PollSubscriptionPayload` with `pollEventType = POLL_VOTE_UPDATED`.
  - `addPollOption` → after option persist, publish `PollSubscriptionPayload` with `pollEventType = POLL_OPTIONS_CHANGED`.
  - `updatePollOption` → after option text update + vote cleanup, publish `PollSubscriptionPayload` with `pollEventType = POLL_OPTIONS_CHANGED`.
  - `removePollOption` → after option removal + vote cleanup, publish `PollSubscriptionPayload` with `pollEventType = POLL_OPTIONS_CHANGED`.
  - `reorderPollOptions` → after reorder persist, publish `PollSubscriptionPayload` with `pollEventType = POLL_OPTIONS_CHANGED`.
  - `updatePollStatus` → after status change, publish `PollSubscriptionPayload` with `pollEventType = POLL_STATUS_CHANGED` through the `pollVoteUpdated` channel.
  - Each publish builds the payload with `pollEventType`, full `poll` entity, and `eventID` via `randomUUID()`.

### Module Wiring (after T085–T086)

- [X] T087 [US7] Update `poll.module.ts` to:
  - Register `PollResolverSubscriptions` as a provider.
  - Add two `PubSubEngine` factory providers for `SUBSCRIPTION_POLL_VOTE_UPDATED` and `SUBSCRIPTION_POLL_OPTIONS_CHANGED` — follow pattern in existing subscription modules (e.g., `virtual.contributor.module.ts` or the callout subscription wiring).
  - Import `SubscriptionServiceModule` if not already imported.

### Tests & Schema (after T085–T087)

- [X] T088 [US7] Add unit tests for `PollResolverSubscriptions`:
  - (a) Filter returns false when `resultsVisibility = HIDDEN` and subscriber has not voted (for `pollVoteUpdated`).
  - (b) Filter returns true when `resultsVisibility = HIDDEN` and subscriber has voted.
  - (c) Filter returns true for all `resultsVisibility` values other than `HIDDEN`.
  - (d) `pollOptionsChanged` filter always returns true regardless of visibility settings.
  - (e) Resolve functions return correct `pollEventType` and `poll` entity.
- [X] T089 [US7] Run `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff`; verify `PollEventType` enum, subscription result types, and `Subscription.pollVoteUpdated` / `Subscription.pollOptionsChanged` fields appear in `change-report.json` as additive (non-breaking).

**Checkpoint**: Two subscription channels functional. HIDDEN visibility suppresses vote events for non-voters. Option events always delivered. Field resolvers filter results per subscriber context. Schema contract passes.

---

## Phase 10: User Story 8 — Close / Reopen Poll (Priority: P8)

**Goal**: Facilitators and admins can close a poll to prevent further votes and option changes, and reopen it later if needed. The status column, enum, and all closed-poll guards already exist — this phase adds only the mutation to change the status.

**Independent Test**: A user with Callout edit permissions calls `updatePollStatus({ pollID, status: CLOSED })`; the returned poll has `status = CLOSED`. Subsequent `castPollVote`, `removePollVote`, `addPollOption`, `updatePollOption`, `removePollOption`, and `reorderPollOptions` all fail with validation errors. Calling `updatePollStatus({ pollID, status: OPEN })` reopens the poll and all operations succeed again. Clients subscribed to `pollVoteUpdated(pollID)` receive a `POLL_STATUS_CHANGED` event with the updated poll (no notifications dispatched).

### Implementation

- [X] T090 [P] [US8] Create `UpdatePollStatusInput` input DTO in `src/domain/collaboration/poll/dto/poll.dto.update.status.ts`: `pollID: UUID!` (with `@IsUUID()`) and `status: PollStatus!` (with `@IsEnum(PollStatus)`)
- [X] T091 [US8] Implement `PollService.updateStatus(pollId: string, status: PollStatus): Promise<Poll>` in `src/domain/collaboration/poll/poll.service.ts`: (1) load `Poll` via `getPollOrFail(pollId)`; (2) set `poll.status = status`; (3) persist via repository save; (4) return updated `Poll`. The method is idempotent — setting to the current status succeeds without error. No notifications are dispatched on status change.
- [X] T092 [US8] Create `updatePollStatus` mutation in `src/domain/collaboration/poll/poll.resolver.mutations.ts`: `@Mutation(() => IPoll, { description: 'Change the status of a Poll (OPEN ↔ CLOSED).' }) updatePollStatus(@Args('statusData') statusData: UpdatePollStatusInput, @CurrentUser() user: AgentInfo): Promise<IPoll>`; enforce `UPDATE` privilege on the parent Callout (same authorization as `updatePollOption`, `removePollOption`, `reorderPollOptions`); call `PollService.updateStatus(statusData.pollID, statusData.status)`; return updated `Poll`. After status update, publishes a `POLL_STATUS_CHANGED` event through the `pollVoteUpdated` subscription channel so real-time clients see the status change.
- [X] T093 [US8] Add unit tests in `src/domain/collaboration/poll/poll.service.spec.ts` for `updateStatus()`: (a) OPEN → CLOSED succeeds and returns poll with `status = CLOSED`; (b) CLOSED → OPEN succeeds and returns poll with `status = OPEN`; (c) OPEN → OPEN succeeds idempotently (no error); (d) CLOSED → CLOSED succeeds idempotently (no error). Additionally, unit tests for `POLL_STATUS_CHANGED` subscription events added in `poll.resolver.subscriptions.spec.ts`: (e) resolve returns correct `pollEventType = POLL_STATUS_CHANGED`; (f) filter returns true when pollID matches and visibility is VISIBLE; (g) filter returns false when pollID does not match; (h) filter suppresses event when HIDDEN and subscriber has not voted; (i) filter delivers event when HIDDEN and subscriber has voted. Also added publish service test in `subscription.publish.service.spec.ts` verifying `POLL_STATUS_CHANGED` routes through the poll vote updated channel.
- [X] T094 [US8] Run `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff`; verify `updatePollStatus` mutation, `UpdatePollStatusInput`, and `POLL_STATUS_CHANGED` enum value appear in `change-report.json` as additive (non-breaking)

**Checkpoint**: Poll lifecycle is complete. Facilitators can close and reopen polls. All existing closed-poll guards (6 mutations) are now reachable via the `updatePollStatus` mutation.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation fixes, schema contract generation, lint/test verification, migration validation, quickstart smoke test.

- [X] T066 [P] Fix `specs/038-community-polls/quickstart.md` — H1 fix: update all read queries to use `poll { settings { minResponses maxResponses resultsVisibility resultsDetail } status ... }` instead of flat `poll.minResponses` etc. (Steps 1, 4, and Settings Verification section)
- [X] T067 [P] Fix `specs/038-community-polls/quickstart.md` — H2 fix: update Multi-Select Poll Example mutation to wrap `minResponses`/`maxResponses` inside `settings: { minResponses: 1, maxResponses: 0 }` inside `CreatePollInput`
- [X] T068 [P] Fix `specs/038-community-polls/plan.md` — H3 fix: update the Summary paragraph to replace "a background cleanup listener removes all Poll votes" with "DB-level `ON DELETE CASCADE` on `poll_vote.createdBy` (FK → user(id)) automatically removes PollVote rows when the user account is deleted — no application-level cleanup listener required"
- [X] T069 Run `pnpm run migration:run` and confirm migration applies without error; run `pnpm run migration:revert` and confirm rollback completes; re-run `pnpm run migration:run` to restore the state. Also verify FK cascade behavior for FR-019: using `psql`, insert a test `poll_vote` row for a test user, delete the user row, and confirm the `poll_vote` row is automatically deleted by the DB cascade — this is the only verification of the `createdBy FK → user(id) ON DELETE CASCADE` guarantee.
- [X] T070 [P] Run `pnpm run schema:print && pnpm run schema:sort`; diff against baseline with `pnpm run schema:diff`; review `change-report.json` for BREAKING changes — new types and fields are additive (no breaking changes expected); verify `Poll`, `PollOption`, `PollVote`, `PollSettings` types are present and `CalloutFraming.poll` field is added
- [X] T071 [P] Run `pnpm lint` (tsc + Biome); fix any reported violations before marking complete — key rules: no `console.*` (use Winston), no explicit `any`, no unused imports
- [X] T072 Run `pnpm test:ci:no:coverage` to verify all unit tests pass (T034, T039, T047, T054, T065)
- [X] T072a [US5] Add `allowContributorsAddOptions` setting (FR-004a): (1) add `allowContributorsAddOptions: Boolean!` to `IPollSettings` in `poll.settings.interface.ts`; (2) add `allowContributorsAddOptions?: Boolean` to `PollSettingsInput` in `poll.dto.create.ts` with `@IsBoolean()` validator; (3) default to `false` in `PollService.createPoll()`; (4) update `addPollOption` mutation auth in `poll.resolver.mutations.ts`: check `UPDATE` OR (`CONTRIBUTE` when `settings.allowContributorsAddOptions = true`); (5) update unit test default-settings assertion in `poll.service.spec.ts`; (6) update all settings fixtures in spec tests to include the new field
- [ ] T073 [P] Validate the quickstart.md scenarios against the running server (`pnpm start:dev`): execute Steps 1–8 from the corrected quickstart.md using the `/gql` skill or GraphQL playground; verify each "Verify:" assertion passes

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └─► Phase 2 (Foundational) ─┬─► Phase 3 (US1 - Create Poll)
                               ├─► Phase 4 (US2+US4a - Vote)      ← depends on US1 data to test
                               ├─► Phase 4b (US4b - Vote Removal) ← depends on Phase 4 castVote
                               ├─► Phase 5 (US3 - Results)        ← depends on US2 votes to test
                               ├─► Phase 6 (US5 - Options)        ← depends on US1 data to test
                               ├─► Phase 7 (US6 - Notifications)  ← depends on US2+US4b+US5 hooks
                               ├─► Phase 9 (US7 - Subscriptions)  ← depends on US2+US4b+US5 mutations
                               └─► Phase 10 (US8 - Close/Reopen)  ← depends on Phase 2 only (guards already exist)
Phase 8 (Polish) ← depends on all phases complete (including Phase 9 and Phase 10)
```

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2 — no other story dependency
- **US2 (P2)**: Requires US1 data (a poll must exist to vote on); can be implemented independently once Phase 2 is complete
- **US3 (P3)**: Requires US2 to have cast votes for meaningful test data; implementation is independent of US2 code
- **US4a (P4 cast)**: Implemented in Phase 4 as the core `castVote()` mutation for both new votes and vote updates
- **US4b (P4 removal)**: Implemented in Phase 4b as `removePollVote()` mutation; depends on Phase 4 `castVote()` service method existing; optional vote removal capability
- **US5 (P5)**: Requires US1 data; notification stubs reference US6 but mutations work without notifications
- **US6 (P6)**: Wires into US2 (`castVote`), US4b (`removePollVote`), and US5 (option mutations); must be done after US2, US4b, and US5 service methods exist
- **US7 (P7)**: Wires into US2 (`castVote`), US4b (`removePollVote`), and US5 (option mutations) for publishing events; requires Poll entities and all vote/option mutations to be functional. Independent of US6 (notifications)
- **US8 (P8)**: Depends only on Phase 2 — the `PollStatus` enum, entity column, and all mutation guards are already in place; this phase only adds the `updatePollStatus` mutation

### Within Each Phase: Execution Order

1. [P] tasks in the phase run in parallel
2. DTOs/interfaces before services
3. Services before resolver mutations
4. Field resolvers after service methods that back them
5. Unit tests after the service method under test

---

## Parallel Execution Examples

### Phase 2 — Foundational

```
Parallel batch 1: T005, T006, T007            (enums — no dependencies)
Parallel batch 2: T008, T009, T010, T011      (interfaces — after enums)
Parallel batch 3: T012, T013, T014            (entities — after interfaces)
Parallel batch 4: T017, T018                  (module skeletons — after entities; T015/T016 eliminated)
Sequential:       T019, T020, T021            (module wiring — one at a time)
Sequential:       T022, T023, T024, T025      (CalloutFraming mods)
Sequential:       T026                        (migration — after all entity changes)
```

### Phase 3 — US1

```
Parallel batch 1: T027, T028                  (DTOs — no inter-dependencies)
Sequential:       T029                        (PollService.createPoll — after DTOs)
Parallel batch 2: T030, T031                  (auth service + DTO extension — after T029)
Sequential:       T032                        (CalloutFramingService — after T030, T031)
Sequential:       T033                        (field resolver — after T032)
Sequential:       T034                        (unit tests — after T029)
```

### Phase 4 — US2+US4a

```
Parallel batch 1: T035, T036                  (DTOs + service method — fully parallel)
Sequential:       T037                        (mutation resolver — after T036)
Sequential:       T038                        (myVote field resolver — after T036)
Sequential:       T039                        (unit tests — after T036)
```

### Phase 4b — US4b

```
Sequential:       T039a                       (DTO — standalone)
Sequential:       T039b                       (PollVoteService.removeVote — after DTO)
Sequential:       T039c                       (removePollVote mutation — after T039b)
Sequential:       T039d                       (subscription publish hook — after T039c)
Sequential:       T039e                       (unit tests — after T039b, T039c)
```

### Phase 7 — US6
```
Parallel batch 1: T055, T056, T057, T058      (enums, prefs, DTOs, payload — fully parallel)
Sequential:       T059                        (adapter methods — after T055–T058)
Sequential:       T060                        (recipients service — after T059)
Sequential:       T061, T062, T063, T064      (wiring — after T060; one mutation at a time)
Sequential:       T065                        (tests — after T061–T064)
```

### Phase 9 — US7

```
Parallel batch 1: T074, T075, T076            (enum, subscription type, symbols — fully parallel)
Parallel batch 2: T077, T078, T079, T080, T081 (payloads, result types, args — after batch 1)
Parallel batch 3: T082, T083, T084            (read/publish service methods — after T076)
Sequential:       T085                        (subscription resolver — after T079–T084)
Sequential:       T086                        (mutation wiring — after T084)
Sequential:       T087                        (module wiring — after T085, T086)
Sequential:       T088                        (unit tests — after T085)
Sequential:       T089                        (schema contract — after T087)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T026 — CRITICAL, blocks everything)
3. Complete Phase 3: User Story 1 (T027–T034)
4. **STOP and VALIDATE**: Create a poll via `createCallout`; query it back; confirm static fields, options with `sortOrder`, and authorization errors for non-permitted users
5. Run migration, lint, and unit tests
6. Demo/review MVP

### Incremental Delivery

1. Phases 1–2 → Foundation ready (entities, modules, migration)
2. Phase 3 → Poll creation works → can be demoed
3. Phase 4 → Voting works → can be demoed with results
4. Phase 4b → Vote removal works → full vote lifecycle complete
5. Phase 5 → Results visible to all members → core value delivered
6. Phase 6 → Option editing works → editorial controls complete
7. Phase 7 → Notifications → engagement loop closed (including vote removal)
8. Phase 9 → Subscriptions → real-time updates delivered to browsers
9. Phase 10 → Close/Reopen → poll lifecycle complete
10. Phase 8 → Polish → production-ready

### Single-Developer Sequence

Complete phases in order: 1 → 2 → 3 → 4 → 4b → 5 → 6 → 7 → 9 → 10 → 8. Stop at each **Checkpoint** to validate the story independently before proceeding.

---

## Notes

- **[P]** tasks touch different files with no dependency on incomplete work in the same phase — safe to run concurrently
- **[Story]** label maps each task to the user story for traceability; Setup/Foundational/Polish phases have no story label
- Notification dispatch (`castVote`, option mutations) is **synchronous** per existing callout notification pattern (research.md §7); this deviates from constitution Principle 4 but follows the established codebase pattern — documented in plan.md constitution check
- `settings` JSONB is **immutable after creation** — no update path exists; the resolver must reject any attempt to change it
- The two-pass `reorderOptions` transaction is required by the UNIQUE `(pollId, sortOrder)` constraint — do not simplify to a single pass
- `createdBy` FK `ON DELETE CASCADE` handles account deletion automatically at the DB level — no application listener needed
- DataLoader for voter resolution (T045) must be request-scoped to avoid cross-request cache poisoning

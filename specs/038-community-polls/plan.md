# Implementation Plan: Community Polls & Voting

**Branch**: `038-community-polls` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/038-community-polls/spec.md`

## Summary

Add a Poll composition object to CalloutFraming that lets space members vote on community questions (single-select or multi-select), view transparent results, and change their vote at any time. Polls are created as part of the existing `createCallout` mutation by extending `CreateCalloutFramingInput` with an optional `poll` field (same pattern as `whiteboard`/`link`/`memo`) — no separate creation mutation is exposed. Poll option management and voting are five new mutations (including `removePollVote` for vote withdrawal). Poll notifications are delivered through the existing dual-channel notification infrastructure for both Callout creators and existing voters, with four dedicated preference fields (`collaborationPollVoteCastOnOwnPoll`, `collaborationPollVoteCastOnPollIVotedOn`, `collaborationPollModifiedOnPollIVotedOn`, `collaborationPollVoteAffectedByOptionChange`). Visibility/detail settings (`resultsVisibility`, `resultsDetail`) and future `status`/`deadline` compatibility are modeled explicitly. Poll votes authored by a deleted user account are removed automatically via a DB-level `ON DELETE CASCADE` constraint on `poll_vote.createdBy` (FK → `user.id`) — no application-level cleanup listener is required. Two real-time GraphQL subscriptions (`pollVoteUpdated`, `pollOptionsChanged`) push live updates to viewers, respecting visibility/detail settings per subscriber by reusing existing field resolver filtering logic.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16, PostgreSQL 17.5
**Storage**: PostgreSQL 17.5 — three new tables (`poll`, `poll_option`, `poll_vote`); options normalized into `poll_option`; selected option IDs stored as JSONB on `poll_vote`
**Testing**: Vitest 4.x — unit tests for PollService invariants; no full integration tests required (risk-based: authorization is covered by framework tests)
**Target Platform**: Linux server — same deployment target as existing service
**Project Type**: Single NestJS monolith (`src/`)
**Performance Goals**: Results queries must be < 200 ms p95 for polls with up to 20 options and 500 voters (SC-008 scaled). A request-scoped `PollDataLoader` batches repeated `getPollOrFail` and `getVoteForUser` calls across concurrent field resolvers into single SQL queries per request, preventing N+1 query amplification.
**Constraints**: Options returned in `sortOrder ASC`; real-time subscriptions deliver poll updates via PubSub (same infrastructure as existing callout/VC subscriptions)
**Account Deletion Handling**: Poll votes are removed when a user is deleted via Foreign Key Cascade.
**Scale/Scope**: Polls are per-Callout; typical poll has 2–20 options and 5–200 voters per space; no sharding needed

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| **1. Domain-Centric Design** | PASS | Poll, PollOption, PollVote live in `src/domain/collaboration/`; no business logic in resolvers |
| **2. Modular NestJS Boundaries** | PASS | Three focused modules: `PollModule`, `PollOptionModule`, `PollVoteModule`; no circular deps |
| **3. GraphQL Schema as Stable Contract** | PASS | New types only; no breaking changes to existing schema; deprecation not needed |
| **4. Explicit Data & Event Flow** | DEVIATION (accepted) | Vote path: validate → authorize → domain op → **direct notification adapter call** → persist. Principle 4 requires side effects to subscribe to domain events, never embedded inline. Deviation accepted: existing callout-contribution notifications follow the same synchronous direct-call pattern (see research.md §7 — async RabbitMQ dispatch was explicitly rejected to stay consistent with the codebase). No domain event bus is introduced; the notification adapter is called synchronously from the service method, matching the established pattern. |
| **5. Observability & Operational Readiness** | PASS | Structured log contexts defined per module; no orphaned metrics |
| **6. Code Quality with Pragmatic Testing** | PASS | Unit tests for PollService invariants (vote mode enforcement, min-option validation); defaults validation |
| **7. API Consistency & Evolution Discipline** | PASS | Poll created via extended `CreateCalloutFramingInput`; mutation names: `castPollVote`, `removePollVote`, `addPollOption`, `updatePollOption`, `removePollOption`, `reorderPollOptions`; inputs end with `Input` |
| **8. Secure-by-Design Integration** | PASS | Voting requires `CONTRIBUTE` privilege on Poll; editing requires `UPDATE` on Callout; non-members blocked |
| **9. Container & Deployment Determinism** | PASS | Migration generated and committed; no runtime process.env reads |
| **10. Simplicity & Incremental Hardening** | PASS | Simplest normalized model; no CQRS/event-sourcing; relational options with JSONB vote selections |

**Post-design re-check**: PASS (see data-model.md — no architectural escalation required)

## Project Structure

### Documentation (this feature)

```text
specs/038-community-polls/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── schema.graphql
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/domain/collaboration/
├── poll/                          # NEW — Poll aggregate root
│   ├── poll.entity.ts
│   ├── poll.interface.ts
│   ├── poll.service.ts            # createPoll, addOption, updateOption, removeOption, reorderOptions
│   ├── poll.service.authorization.ts
│   ├── poll.data.loader.ts        # Request-scoped DataLoader — batches getPoll and getUserVote queries across field resolvers (SC-008)
│   ├── poll.module.ts
│   ├── poll.resolver.mutations.ts # addPollOption, updatePollOption, removePollOption, reorderPollOptions, castPollVote, removePollVote
│   ├── poll.resolver.fields.ts    # options (enriched), myVote field resolvers — uses PollDataLoader to avoid N+1 queries
│   └── dto/
│       ├── poll.dto.create.ts
│       └── poll.dto.option.ts     # AddPollOptionInput, UpdatePollOptionInput, ReorderPollOptionsInput
├── poll-option/                   # NEW — Poll option entity (one row per option)
│   ├── poll.option.entity.ts
│   ├── poll.option.interface.ts
│   ├── poll.option.service.ts
│   └── poll.option.module.ts
├── poll-vote/                     # NEW — Vote record (per member per Poll)
│   ├── poll.vote.entity.ts
│   ├── poll.vote.interface.ts
│   ├── poll.vote.service.ts
│   ├── poll.vote.module.ts
│   └── dto/
│       ├── poll.vote.dto.cast.ts
│       └── poll.vote.dto.remove.ts
├── callout-framing/               # MODIFIED — add poll OneToOne relation
│   ├── callout.framing.entity.ts  # + poll?: Poll
│   ├── callout.framing.interface.ts # + poll?: IPoll
│   ├── callout.framing.service.ts  # + createPollOnFraming (called from createCalloutFraming)
│   ├── callout.framing.resolver.fields.ts  # + poll @ResolveField (nullable IPoll)
│   └── dto/
│       ├── callout.framing.dto.create.ts  # + poll?: CreatePollInput field
│       └── callout.framing.dto.update.ts  # no poll field needed (poll options managed via separate mutations)
└── callout/
    └── callout.resolver.mutations.ts # + createCallout extended to support poll creation via CreateCalloutFramingInput

src/common/enums/
├── poll.status.ts                 # NEW: OPEN | CLOSED
├── poll.results.visibility.ts     # NEW: HIDDEN | TOTAL_ONLY | VISIBLE
└── poll.results.detail.ts         # NEW: PERCENTAGE | COUNT | FULL
# No PollVotingMode enum — selection constraints are minResponses/maxResponses integers on Poll entity

src/services/adapters/
└── notification-adapter/
    ├── dto/space/
    │   ├── notification.dto.input.space.collaboration.poll.vote.cast.on.own.poll.ts  # NEW
    │   ├── notification.dto.input.space.collaboration.poll.vote.cast.on.poll.i.voted.on.ts  # NEW
    │   ├── notification.dto.input.space.collaboration.poll.modified.on.poll.i.voted.on.ts  # NEW
    │   └── notification.dto.input.space.collaboration.poll.vote.affected.by.option.change.ts  # NEW
    └── notification.space.adapter.ts  # + 4 methods mapping to the 4 events:
        # spaceCollaborationPollVoteCastOnOwnPoll() → SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL
        # spaceCollaborationPollVoteCastOnPollIVotedOn() → SPACE_COLLABORATION_POLL_VOTE_CAST_ON_POLL_I_VOTED_ON
        # spaceCollaborationPollModifiedOnPollIVotedOn() → SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON
        # spaceCollaborationPollVoteAffectedByOptionChange() → SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE

src/common/enums/
└── notification.event.ts  # + SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL, SPACE_COLLABORATION_POLL_VOTE_CAST_ON_POLL_I_VOTED_ON, SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON, SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE

src/services/api/notification-recipients/
└── notification.recipients.service.ts  # + poll notification recipient-resolution cases for creator and prior voters

src/platform/in-app-notification-payload/dto/space/
└── notification.in.app.payload.space.collaboration.poll.ts  # NEW

src/domain/community/user-settings/
└── user.settings.notification.space.interface.ts  # + collaborationPollVoteCastOnOwnPoll, collaborationPollVoteCastOnPollIVotedOn, collaborationPollModifiedOnPollIVotedOn, collaborationPollVoteAffectedByOptionChange

src/common/enums/
└── subscription.type.ts  # + POLL_VOTE_UPDATED, POLL_OPTIONS_CHANGED

src/common/constants/
└── providers.ts  # + SUBSCRIPTION_POLL_VOTE_UPDATED, SUBSCRIPTION_POLL_OPTIONS_CHANGED

src/services/subscriptions/subscription-service/
├── subscription.read.service.ts     # + subscribeToPollVoteUpdated(), subscribeToPollOptionsChanged()
├── subscription.publish.service.ts  # + publishPollVoteUpdated(), publishPollOptionsChanged()
└── dto/
    ├── poll.vote.updated.subscription.payload.ts     # NEW
    └── poll.options.changed.subscription.payload.ts  # NEW

src/domain/collaboration/poll/
├── poll.resolver.subscriptions.ts   # NEW — pollVoteUpdated, pollOptionsChanged subscription resolvers
└── dto/
    ├── poll.subscription.args.ts               # NEW — PollSubscriptionArgs (shared by both subscriptions)
    ├── poll.vote.updated.subscription.result.ts      # NEW — PollVoteUpdatedSubscriptionResult GraphQL ObjectType
    └── poll.options.changed.subscription.result.ts   # NEW — PollOptionsChangedSubscriptionResult GraphQL ObjectType

src/common/enums/
└── poll.event.type.ts  # NEW — PollEventType enum (POLL_VOTE_UPDATED, POLL_OPTIONS_CHANGED)

src/migrations/
└── {TIMESTAMP}-CommunityPolls.ts  # NEW — creates poll, poll_option, poll_vote tables; adds pollId to callout_framing
```

**Structure Decision**: Single project, Option 1. New modules follow `src/domain/collaboration/` convention. Poll-specific mutations (`addPollOption`, `updatePollOption`, `removePollOption`, `reorderPollOptions`, `castPollVote`) are defined in the `PollModule` resolver for clear separation of concerns. Poll creation occurs via the extended `createCallout` mutation in `CalloutModule` (consistent with how other callout framings like whiteboards and links are created).

## Complexity Tracking

> No constitution violations requiring justification.

---

## Revision History

**2026-03-03**: Expanded notification scope to include existing-voter notifications in iteration 1.
- **Change**: Confirmed that notifications for existing voters are in-scope (vote cast on polls I voted on, poll modified on polls I voted on, and vote affected by option changes), in addition to creator vote-cast notifications.
- **Rationale**: Align plan scope with updated specification requirements (FR-021a..FR-021d) and remove ambiguity before task breakdown.
- **Affected files**: `plan.md`, `spec.md`.
- **Resolves**: C1 (critical inconsistency between in-scope requirements and out-of-scope future section).

**2026-03-03**: Updated specification to enforce complete vote replacement semantics and simplified option removal cleanup.
- **Change**: Vote updates now require submitting the complete new selection set; partial modifications (adding/removing individual options) are not supported. Option removal now deletes all affected votes entirely.
- **Rationale**: Ensures validation (`minResponses`, `maxResponses`) is consistently applied on every vote modification, preventing invalid vote states. Option removal deletes full votes for simplicity and clarity—prevents partial states and ensures voters make conscious, complete choices under the new poll structure.
- **Impact on option removal**: When an option is removed, all votes containing that option are deleted entirely—no re-validation or partial preservation.
- **Affected files**: `spec.md` (FR-006, FR-012, User Stories 4 & 5), `data-model.md` (vote casting validation, option removal logic, state transitions), `contracts/schema.graphql` (mutation comments, input descriptions), `research.md` (option removal decision), `quickstart.md` (examples), `checklists/requirements.md` (notes).
- **Resolves**: Specification issue H3 (underspecification of vote cleanup when remaining selections fall below minResponses).

**2026-03-11**: Added real-time GraphQL subscriptions (User Story 7).
- **Change**: Two new GraphQL subscriptions (`pollVoteUpdated`, `pollOptionsChanged`) push live poll updates to viewers. Subscription payloads return the full `Poll` object; existing field resolvers handle per-subscriber visibility/detail filtering — no separate filtering logic.
- **Rationale**: Completes the real-time collaboration experience; previously deferred to future scope (SC-004). The design reuses the established PubSub infrastructure (`graphql-subscriptions`, `SubscriptionReadService`, `SubscriptionPublishService`, `TypedSubscription` decorator) and publishes events from the existing mutation resolvers.
- **Key design decisions**: (1) Two separate subscriptions (not combined) — different event frequencies and client interests. (2) Full `Poll` return type — field resolvers apply visibility/detail filtering per subscriber's `@CurrentActor()` context. (3) Vote events suppressed entirely for `HIDDEN + not-voted` subscribers in the subscription filter. (4) Debug-level logging. (5) Future-events-only (no catch-up), consistent with all platform subscriptions. (6) `pollEventType` field included in subscription result types for client routing.
- **Affected files**: `spec.md` (US7, FR-028..FR-031, SC-004, clarifications, future scope), `plan.md` (summary, constraints, project structure, revision history), `data-model.md` (subscription infrastructure), `tasks.md` (Phase 9), `contracts/schema.graphql` (subscription types).
- **New source files**: `poll.resolver.subscriptions.ts`, `poll.subscription.args.ts`, `poll.vote.updated.subscription.result.ts`, `poll.options.changed.subscription.result.ts`, `poll.vote.updated.subscription.payload.ts`, `poll.options.changed.subscription.payload.ts`, `poll.event.type.ts`.
- **Modified source files**: `subscription.type.ts`, `providers.ts` (constants), `subscription.read.service.ts`, `subscription.publish.service.ts`, `poll.resolver.mutations.ts`, `poll.module.ts`.

**2026-03-18**: Added `removePollVote` mutation for vote withdrawal.
- **Change**: New mutation `removePollVote(pollID: UUID!)` allows voters to completely remove their vote from a poll. Returns updated Poll with `myVote` cleared and vote counts decremented.
- **Rationale**: Completes the vote lifecycle (cast → update → remove). Users may want to withdraw participation entirely rather than just changing their selection.
- **Behavior**: Mutation fails with ValidationException if user has not voted. Vote removal is silent — no notifications sent to poll creator or other voters (per FR-020a/b clarification) — but `pollVoteUpdated` subscription fires so real-time viewers see updated counts.
- **Affected files**: `spec.md` (FR-012a, FR-012b, US4 scenarios 5-6, SC-006a, edge cases, clarifications), `contracts/schema.graphql` (new mutation), `poll.service.ts`, `poll.resolver.mutations.ts`.
- **Resolves**: Vote withdrawal capability gap.

**2026-03-18**: Added `allowContributorsAddOptions` poll setting.
- **Change**: New boolean `allowContributorsAddOptions` (default `false`) in `IPollSettings` / `PollSettingsInput`. When `true`, users with `CONTRIBUTE` privilege (voters) can add new options to the poll via `addPollOption`. Editing, removing, and reordering remain `UPDATE`-only.
- **Rationale**: Enables collaborative poll building where the community can suggest their own answers, controlled per-poll by the creator.
- **Authorization impact**: `addPollOption` now checks `UPDATE` OR (`CONTRIBUTE` + `allowContributorsAddOptions = true`). Constitution Check row 8 updated: secure-by-design is maintained — the setting is immutable after creation, preventing privilege escalation.
- **Affected files**: `spec.md` (FR-004a, FR-025, US5 scenarios 6-7, Key Entities, clarifications), `data-model.md` (ERD, validation rules, interfaces, authorization table), `tasks.md` (T008, T027, T053), `contracts/schema.graphql` (PollSettings, PollSettingsInput), `quickstart.md` (examples), `poll.settings.interface.ts`, `poll.dto.create.ts`, `poll.service.ts`, `poll.resolver.mutations.ts`, `poll.service.spec.ts`, `poll.resolver.subscriptions.spec.ts`.

# Data Model: Server-Side Synchronous Room-Check

**Feature**: `099-element-room-check` | **Phase**: 1 | **Date**: 2026-05-20

## Schema changes

**None.** This feature introduces no new tables, columns, indices, or migrations. It exercises existing entities exclusively. Below is the touchpoint map plus the inbound-payload → entity mapping rules.

## Entities exercised

### Conversation (`src/domain/communication/conversation/conversation.entity.ts`)
- Created with `authorization` (fresh `AuthorizationPolicy` of type `COMMUNICATION_CONVERSATION`).
- `room` set to the freshly-created Room (see below).
- `messaging` set to the platform-level Messaging singleton (same pattern as existing `MessagingService.createConversation` at line 166).
- No `type` column on Conversation itself — the type is captured solely on the linked `Room.type` (`CONVERSATION_DIRECT` vs `CONVERSATION_GROUP`).

### Room (`src/domain/communication/room/room.entity.ts`)
- **`id` is supplied by the server-side UUID generator inside `MessagingService.createConversationFromExternal` and embedded in the returned `CheckResult`.** This is the key behavioural difference vs. the existing `MessagingService.createConversation` flow.
- `type` is `CONVERSATION_DIRECT` (`is_direct: true`) or `CONVERSATION_GROUP` (`is_direct: false`).
- `displayName` always `""` (the adapter sets the human-readable name during reconciliation via room state).
- `avatarUrl` always `""` (same reason).
- `messagesCount = 0` at creation.
- `authorization` cascaded from Conversation per the existing pattern.
- **Critically**: `RoomService.createRoomFromExternal({ id, type })` MUST NOT call `createExternalCommunicationRoom` — the room is created by Synapse (after the check approval) and reconciled by the adapter (using `io.alkemio.pending` to carry the assigned UUID through). Calling the adapter to "create" a Matrix room here would either alias-collide or duplicate.

### ConversationMembership (`src/domain/communication/conversation/conversation.membership.entity.ts`)
- Composite PK `(conversationId, actorId)`.
- One row per registered member (creator + every member whose `User.settings.communication.allowOtherUsersToSendMessages` evaluates true).

### Authorization (existing entity)
- One `AuthorizationPolicy` row per `Conversation` (cascaded). Credential rules populated by the existing post-create authorization cascade that already runs for Alkemio-initiated conversations (per FR-017 indistinguishability).

## Inbound payload → entity mapping (room.check)

| Inbound field | Source | Destination entity/column | Notes |
|---|---|---|---|
| `is_direct` | adapter | (decides) `Room.type` | `true` → `CONVERSATION_DIRECT`, `false` → `CONVERSATION_GROUP` |
| `creator_actor_id` | adapter | one `ConversationMembership.actorId` | Always registered; their consent setting is never evaluated |
| `member_actor_ids[]` | adapter | filtered to *consenting members*, each becomes one `ConversationMembership.actorId` row | Creator MUST NOT appear here per the contract |
| _(server-generated)_ | — | `Room.id` | Fresh UUID assigned at the start of `createConversationFromExternal`; returned to the adapter in the `allow: true` response |
| _(none — server defaults)_ | — | `Room.displayName`, `Room.avatarUrl` | Both empty string |

## Outbound payload → wire mapping

### `room.check` reply
- `allow = true`: `alkemio_room_id` = the UUID assigned to `Room.id`.
- `allow = false`: `reason` = the human-readable string from `MessagingRejectionReason` (see `research.md` R-008). One of:
  - `"actor not found"` — initiator or any member doesn't resolve to a known Alkemio user
  - `"messaging disabled for the target user"` — DM target has the inbound-messaging setting off
  - `"no recipients allow messaging"` — every non-creator group member has the setting off
  - `"a direct conversation between these users already exists"` — DM dedup hit
  - `"malformed check request"` — payload validation failure
  - `"internal error"` — transient unexpected failure

### `room.info` reply
- `alkemio_room_id` = echoed from request.
- `type` = `Room.type` (`'conversation_direct'` or `'conversation_group'`).
- `is_direct` = convenience flag derived from `Room.type`.
- `members[]` = one entry per `ConversationMembership`, with:
  - `actor_id` = `ConversationMembership.actorId`
  - `display_name` = `getMatrixDisplayName(actor)` (formula `profile.displayName || nameID`, per FR-018)

If no Conversation exists for the requested UUID, `members[]` is empty, `type` is empty string, `is_direct` is `false`. No error is raised.

## Partial-rejection arithmetic

Let `creator` = `creator_actor_id`, `members` = `member_actor_ids[]` (does NOT include creator per contract), `denying` ⊆ `members` (those with `allowOtherUsersToSendMessages` disabled at processing time).

| Condition | Result | `room.check` response |
|---|---|---|
| `is_direct=true`, `members.length != 1` | malformed | `{ allow: false, reason: 'malformed check request' }` |
| `is_direct=true`, member denies consent | full reject | `{ allow: false, reason: 'messaging disabled for the target user' }` |
| `is_direct=true`, member consents, existing DM | duplicate reject | `{ allow: false, reason: 'a direct conversation between these users already exists' }` |
| `is_direct=true`, member consents, no existing DM | accept | `{ allow: true, alkemio_room_id: <new uuid> }`; Conversation persisted with `{creator, member}` |
| `is_direct=false`, `members.length < 1` | malformed | `{ allow: false, reason: 'malformed check request' }` |
| `is_direct=false`, all members deny | full reject | `{ allow: false, reason: 'no recipients allow messaging' }` |
| `is_direct=false`, mixed | accept (partial filter) | `{ allow: true, alkemio_room_id: <new uuid> }`; Conversation persisted with `{creator} ∪ (members \ denying)` |
| `is_direct=false`, all members consent | accept | `{ allow: true, alkemio_room_id: <new uuid> }`; Conversation persisted with `{creator} ∪ members` |
| Any input shape violation (duplicate id, creator-in-members, non-UUID, etc.) | malformed | `{ allow: false, reason: 'malformed check request' }` |
| Unresolved actor id (initiator or any member) | malformed | `{ allow: false, reason: 'actor not found' }` |
| Transient persistence failure | internal | `{ allow: false, reason: 'internal error' }` (cause logged at ERROR with structured `details`) |

## Authorization & subscriptions

- The `conversationCreated` subscription event is fired exactly once per accepted check by `MessagingService.publishConversationCreatedEvents` (private helper at `messaging.service.ts:197-210`) — the **same publisher** invoked by `MessagingService.createConversation` at line 184. The new wrapper `createConversationFromExternal` calls it internally on its `accepted` branch (including the partial-rejection sub-case where the Conversation is created with a filtered membership set — the fan-out covers only registered members).
- For the rejected branches (any `reason`), no subscription is published.
- Authorization-policy reset for the new Conversation reuses the existing post-create cascade — no new authorization rules introduced.

## Concurrency control

- `persistConversationCore` runs inside a single TypeORM transaction.
- PostgreSQL's PK uniqueness on `room.id` is the cross-replica serialisation point.
- On `UniqueViolation` (which would indicate either an adapter-side double-delivery of the same RPC — unlikely given the request/reply pattern, or a deliberate test), the catch block re-probes via `findConversationByRoomId`; if a Conversation now exists, return its id as `accepted` (idempotent under race).
- Cross-flow race (Element-initiated AND Alkemio-initiated DM for the same pair simultaneously): both paths use the same `findConversationBetweenActors` dedup probe; whichever transaction commits first wins. The Alkemio path returns the existing Conversation transparently; the Element path returns `{ allow: false, reason: 'a direct conversation between these users already exists' }` on retry.

## Test matrix

Risk-based — each row drives at least one test case. Layer = `unit (domain)` for tests in `messaging.service.spec.ts`; `unit (controller)` for tests in `matrix.room.check.controller.spec.ts`; `unit (helper)` for `actor.matrix.display.name.spec.ts`; `integration` for the e2e RabbitMQ test.

| # | Scenario | Layer | Asserts |
|---|---|---|---|
| 1 | DM happy path: both consenting, no prior DM | unit (domain) | `room`+`conversation`+2 memberships persisted; `publishConversationCreatedEvents` invoked with 2-member fan-out; result is `{ kind: 'accepted', alkemioRoomId }`; the assigned UUID matches `Room.id` |
| 2 | DM consent denied | unit (domain) | No persistence; result is `{ kind: 'rejected', reason: MessagingRejectionReason.MESSAGING_DISABLED }`; no subscription publish |
| 3 | DM duplicate (existing Conversation between same pair) | unit (domain) | No persistence; result is `{ kind: 'rejected', reason: MessagingRejectionReason.DUPLICATE_DIRECT_CONVERSATION }`; existing Conversation untouched |
| 4 | Group all-consenting | unit (domain) | `room`+`conversation`+N memberships; subscription fans out to all N |
| 5 | Group all-denying (every non-creator denies) | unit (domain) | No persistence; result is `{ kind: 'rejected', reason: MessagingRejectionReason.NO_RECIPIENTS_ALLOW_MESSAGING }` |
| 6 | Group partial: strict subset denies | unit (domain) | Persistence with only consenting members; subscription fans out to consenters only (NOT denying members); result is `{ kind: 'accepted', alkemioRoomId }` |
| 7 | Group with same membership as an existing group | unit (domain) | New Conversation persisted (no group dedup); existing group unaffected |
| 8 | Unknown initiator id | unit (domain) | No persistence; result is `{ kind: 'rejected', reason: MessagingRejectionReason.ACTOR_NOT_FOUND }` |
| 9 | Unknown member id (one of many) | unit (domain) | No persistence; result is `{ kind: 'rejected', reason: MessagingRejectionReason.ACTOR_NOT_FOUND }` |
| 10 | Malformed: DM with 2 members | unit (domain) | No persistence; `MALFORMED_REQUEST` |
| 11 | Malformed: group with 0 members | unit (domain) | No persistence; `MALFORMED_REQUEST` |
| 12 | Malformed: creator id duplicated in member ids | unit (domain) | No persistence; `MALFORMED_REQUEST` |
| 13 | Malformed: non-UUID actor id | unit (domain) | No persistence; `MALFORMED_REQUEST` |
| 14 | Transient persistence failure (mock throws) | unit (domain) | Result is `{ kind: 'rejected', reason: MessagingRejectionReason.INTERNAL_ERROR }`; logger.error invoked with structured `details` |
| 15 | `room.info` hit | unit (domain) | Returns `{ type, is_direct, members[] }` populated with type + helper-resolved displayNames |
| 16 | `room.info` miss (unknown UUID) | unit (domain) | Returns `{ type: '', is_direct: false, members: [] }` |
| 17 | Controller wire translation: `accepted` → `{ allow: true, alkemio_room_id }` | unit (controller) | Translation correctness; no domain logic |
| 18 | Controller wire translation: `rejected` → `{ allow: false, reason }` | unit (controller) | Translation correctness; no domain logic |
| 19 | `getMatrixDisplayName` formula: profile.displayName populated | unit (helper) | Returns `profile.displayName.trim()` |
| 20 | `getMatrixDisplayName` formula: profile.displayName whitespace, nameID populated | unit (helper) | Returns `nameID` (whitespace-only profile.displayName doesn't count) |
| 21 | `getMatrixDisplayName` formula: profile is undefined, nameID populated | unit (helper) | Returns `nameID` |
| 22 | `getMatrixDisplayName` formula: profile is undefined, nameID is empty | unit (helper) | Returns `nameID` (empty string — defensive only; not reachable in practice given PG constraints) |
| 23 | End-to-end happy path through RabbitMQ RPC | integration | Publish `room.check`, observe DB rows + reply envelope; then publish `room.info` for the assigned UUID and observe member list with helper-resolved displayNames |

Rows 1–9 line up with FRs 003–008; row 10–13 with FR-002; row 14 with FR-012; rows 15–16 with FR-013/014; rows 17–18 with the controller's translation responsibility; rows 19–22 with FR-018; row 23 with SC-001/SC-002.

## FR-018 call-site replacement scope

The displayName helper is also used at three existing call sites that get updated as part of this feature. Each is a one-line replacement (no logic change beyond eliminating the email leak):

| Site | Today | After |
|---|---|---|
| `src/domain/community/user/user.service.ts:232-233` | `${firstName} ${lastName}.trim() \|\| email` | `getMatrixDisplayName(user)` |
| `src/platform-admin/domain/communication/admin.communication.space.sync.service.ts:506` (users) | `${firstName} ${lastName}.trim() \|\| nameID` | `getMatrixDisplayName(user)` |
| `src/platform-admin/domain/communication/admin.communication.space.sync.service.ts:520` (VCs) | `profile.displayName \|\| nameID` | `getMatrixDisplayName(vc)` |
| `src/domain/community/virtual-contributor/virtual.contributor.service.ts:201-202` | `profile.displayName \|\| nameID` | `getMatrixDisplayName(vc)` |

The VC sites are already equivalent in behaviour to the helper — they're switched for consistency, not correctness. The user sites change behaviour:
- `user.service.ts:232`: email is no longer leaked (privacy fix). For users without populated `firstName`/`lastName`, displayName now falls back to `profile.displayName` (which is initialised at user creation; in the rare case it's blank, `nameID` is used).
- `admin.communication.space.sync.service.ts:506`: equivalent in behaviour for default users (profile.displayName ≈ firstName + lastName), but picks up user profile-displayName edits.

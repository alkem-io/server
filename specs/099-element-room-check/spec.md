# Feature Specification: Server-Side Synchronous Room-Check for Element-Initiated Conversations

**Feature Branch**: `099-element-room-check`
**Created**: 2026-05-20
**Status**: Draft
**Input**: User description: "Server-side handling for the synchronous Element room-check flow defined by the matrix-adapter-go feature `050-element-room-check`. Two new server-side RPC handlers (`communication.room.check` and `communication.room.info`) on the matrix-adapter queue. The server is the authority on consent, deduplication, and Conversation entity creation; the adapter calls the check synchronously before any Matrix room is created and calls room.info during post-creation reconciliation. No GraphQL surface changes. No database schema changes. The new flow shares the majority of its logic with the existing client-web `createConversation` mutation; the plan must reuse shared helpers rather than duplicating logic."

## Clarifications

### Session 2026-05-20

- Q: Which formula is the authoritative source of the `display_name` returned in `room.info` (and, more broadly, the displayName the platform supplies whenever Alkemio sets a Matrix-side profile name)? → A: **`profile.displayName || nameID`, uniformly for every Actor type** — User, VirtualContributor, and any other Actor that ever surfaces as a Matrix member. The formula is implemented in a single shared helper (an `IActor`/`NameableEntity`-level method or equivalent util) and used at every Matrix-side displayName call site. This feature MUST replace the existing per-site formulas with the helper, specifically: (a) the new `room.info` handler introduced here; (b) `UserService.syncActor` at `user.service.ts:232-233` which today falls back to `email` and MUST stop leaking email into Matrix; (c) `AdminCommunicationSpaceSyncService` per-user formula at `admin.communication.space.sync.service.ts:506` which today falls back to `nameID` with a `firstName + lastName` head — drops the User-specific head in favour of the uniform helper; (d) `VirtualContributorService.syncActor` callers (`virtual.contributor.service.ts:201-202` and `admin.communication.space.sync.service.ts:520`) which already use a compatible formula — switch to the shared helper for consistency. Rationale: `profile.displayName` is set to `${firstName} ${lastName}` at user-creation time by every production `createUser` call site (`bootstrap.service.ts:317`, `user.identity.service.ts:312`), so for default users the uniform formula yields the same string as today's User-specific formula; it diverges only when a user later edits their profile displayName, in which case the Matrix-side name correctly follows the user's edit instead of being frozen to the original `firstName + lastName`. Email is never used as a fallback — `profile.displayName` is `nullable: false` and the `nameID` fallback is defensive belt-and-suspenders.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - DM from Element with a consenting target (Priority: P1)

A user signed in to Element starts a direct message with another Alkemio user who has inbound messaging enabled and no prior direct conversation between the two. The platform must (a) approve the request synchronously, (b) immediately create the corresponding Conversation entity on the Alkemio side with a server-assigned identifier, and (c) notify both participants in real time via the existing Alkemio conversation subscription so the conversation appears in their Alkemio Messages UI within seconds.

**Why this priority**: This is the primary value of the feature — a one-to-one chat initiated from Element appears immediately on both sides, indistinguishable in subsequent behaviour from a DM started in the Alkemio web UI.

**Independent Test**: Trigger an Element-side DM creation between two consenting users with no prior DM. Verify (a) the platform replies "allow" with a UUID, (b) one Conversation, one Room (whose id equals the assigned UUID), and two memberships exist on the Alkemio side, (c) both users' connected Alkemio clients receive the "conversation created" notification, and (d) a follow-up `room.info` query returns the two members.

**Acceptance Scenarios**:

1. **Given** two users with inbound messaging enabled and no prior direct conversation, **When** an Element-side DM request reaches the platform, **Then** the platform replies "allow" with a freshly assigned UUID and creates the Conversation+Room+memberships atomically.
2. **Given** the conversation has been created, **When** the platform's subscription stream is observed, **Then** a single "conversation created" notification is emitted carrying both members in the fan-out set.
3. **Given** the conversation has been created, **When** the adapter later asks the platform for the room's information by UUID, **Then** the response carries the type (direct), the convenience direct-flag, and the two members (each with id and display name).

---

### User Story 2 - Group from Element with all consenting members (Priority: P1)

A user signed in to Element creates a multi-participant room and invites two or more other Alkemio users, all of whom have inbound messaging enabled. The platform must approve the request, create a group Conversation containing every invited member plus the initiator, and notify everyone in real time.

**Why this priority**: Group conversations are the second core use case. Treating them as a first-class P1 keeps the check flow uniform across types and prevents an inconsistent product where some Element conversations work and others silently fail.

**Independent Test**: Trigger an Element-side group creation with three consenting users. Verify (a) the platform replies "allow" with a UUID, (b) a group Conversation with three memberships exists, (c) all three connected Alkemio clients receive the "conversation created" notification, and (d) a follow-up `room.info` query returns all three members.

**Acceptance Scenarios**:

1. **Given** three or more users with inbound messaging enabled, **When** an Element-side group request reaches the platform, **Then** the platform replies "allow" with a UUID and creates the Conversation with one membership per member.
2. **Given** an Alkemio-initiated group with the exact same membership set already exists, **When** an Element-side group with that set is created, **Then** the platform still approves the new group (group conversations are intentionally NOT deduplicated by membership) and the two groups coexist.

---

### User Story 3 - Group with a mix of consenting and non-consenting members (Priority: P1)

A user from Element creates a group inviting several Alkemio users, of whom a strict subset have inbound messaging disabled. The platform must approve the request and register the Conversation with only the consenting members; the non-consenting members do not appear in the Alkemio Conversation, and the adapter learns of the filtered set when it asks the platform for the room's information during reconciliation.

**Why this priority**: Honouring the per-recipient consent setting in the group flow is the primary safety guarantee for users who have opted out of inbound messaging — it must not be possible to be silently inserted into a group by an Element user.

**Independent Test**: With initiator + member-A (consenting) + member-B (consent-denying), trigger an Element-side group request. Verify (a) the platform replies "allow" with a UUID, (b) the Conversation has exactly two memberships (initiator + member-A), (c) member-B is absent from the membership list, (d) the "conversation created" notification is delivered to initiator and member-A but NOT to member-B, and (e) a follow-up `room.info` query returns only the two registered members.

**Acceptance Scenarios**:

1. **Given** a group request where a strict subset of non-initiator members have inbound messaging disabled, **When** the request reaches the platform, **Then** the platform approves the request and registers a Conversation containing only the initiator and the consenting members.
2. **Given** the Conversation is registered, **When** the adapter queries `room.info` for the assigned UUID, **Then** the response lists only the registered (consenting) members — no excluded-member metadata is carried on the wire.

---

### User Story 4 - DM rejected because target opted out of messaging (Priority: P1)

A user from Element starts a direct message with someone who has turned off inbound messaging. The platform must reject the request synchronously with a user-meaningful reason; the adapter surfaces a "forbidden" error to Element and no platform-side Conversation is created.

**Why this priority**: This is the consent gate's headline behaviour. If it leaks, the messaging-disabled setting is effectively meaningless and the platform loses credibility on user safety.

**Independent Test**: Flip the target user's inbound-messaging setting to disabled. Trigger an Element-side DM. Verify (a) the platform replies "deny" with a reason explaining the target has messaging disabled, (b) no Conversation exists on the platform side, and (c) no subscription notification fires.

**Acceptance Scenarios**:

1. **Given** a target with inbound messaging disabled, **When** the platform receives a DM request for that target, **Then** the platform replies "deny" with a reason indicating messaging is disabled for the target user.
2. **Given** the platform has denied the request, **When** the platform-side state is inspected, **Then** no new Conversation, Room, or membership exists for the requested actors.

---

### User Story 5 - DM rejected because a direct conversation already exists (Priority: P2)

A user from Element starts a direct message with a user with whom they already have an existing Alkemio direct conversation. The platform must reject the request synchronously with a user-meaningful reason; the user is nudged back to the existing conversation via Element's error UI, and no second Conversation is created.

**Why this priority**: Conversation duplication breaks the mental model of "one DM per pair of people" and is a long-known source of support tickets. The behaviour difference from the client-web flow (which transparently returns the existing conversation) is deliberate: Element does not have the affordance to silently merge — it requires an explicit error so the user takes action.

**Independent Test**: Create a DM between users A and B from the Alkemio web UI and send at least one message. Trigger an Element-side DM between the same pair. Verify (a) the platform replies "deny" with a reason indicating a direct conversation between these users already exists, (b) no second Conversation appears, and (c) the existing Conversation still owns all prior messages.

**Acceptance Scenarios**:

1. **Given** an existing direct Conversation between two users, **When** one of them triggers an Element-side DM with the other, **Then** the platform replies "deny" with a reason indicating a direct conversation between these users already exists.
2. **Given** the platform has denied the request, **When** the platform-side state is inspected, **Then** no second Conversation exists for the pair, and the original Conversation is untouched.

---

### User Story 6 - Group rejected because every non-initiator has opted out (Priority: P2)

A user from Element creates a group conversation where every invited member has inbound messaging disabled. The platform must reject the request synchronously with a user-meaningful reason; no group with zero recipients is created.

**Why this priority**: This is the symmetric all-denied branch of US3 — there's nobody to talk to, so creating an empty group would be pointless and confusing.

**Independent Test**: With every invited member's messaging-disabled flag set, trigger an Element-side group. Verify the platform replies "deny" with a reason indicating no recipients allow messaging, and that no Conversation exists.

**Acceptance Scenarios**:

1. **Given** a group request where every non-initiator member has inbound messaging disabled, **When** the request reaches the platform, **Then** the platform replies "deny" with a reason indicating no recipients allow messaging.

---

### User Story 7 - Malformed payload or unknown actor is rejected safely (Priority: P3)

The adapter may publish a malformed check request (wrong shape, missing fields, duplicate ids, initiator listed in the member ids, mismatched count vs type) or one that references actors who do not exist on the platform. The platform must reject such requests synchronously without persisting partial state or affecting subsequent valid requests; the rejection reason is human-readable in the wire response and the underlying detail is captured in the operator-facing logs.

**Why this priority**: This is resilience, not headline value. It protects the request stream from poisoning by malformed inputs without enabling a new user-visible capability.

**Independent Test**: Submit invalid payload variants — DM with two member ids, group with zero member ids, initiator id duplicated in the member ids, member id that does not resolve to a known actor — and verify each is rejected with an appropriate reason, no Conversation is created, no log noise prevents the next valid request from being processed, and successful valid requests still complete normally.

**Acceptance Scenarios**:

1. **Given** a payload whose shape violates the contract, **When** the platform processes it, **Then** the platform replies "deny" with a reason that summarises the contract violation, and no Conversation is created.
2. **Given** a payload referencing an unknown actor id, **When** the platform processes it, **Then** the platform replies "deny" with a reason indicating the actor was not found, and no Conversation is created.
3. **Given** a rejected request has been processed, **When** a subsequent valid request arrives, **Then** it is processed normally — the rejection does not block the request stream.

---

### User Story 8 - `room.info` lookup serves reconciliation (Priority: P2)

After the platform approves a check request, the adapter creates the Matrix room and then needs to reconcile it: join the consenting members, set per-room state, etc. To know which members the platform actually registered, the adapter asks the platform via a separate request keyed by the assigned UUID. The platform replies with the type, the convenience direct-flag, and the registered members.

**Why this priority**: Without this, the adapter cannot know whom to join into the Matrix room — partial-rejection groups would join everybody from the original invite list including consent-denying members, defeating US3.

**Independent Test**: After any approved check (any of US1/US2/US3), invoke the room.info path with the assigned UUID. Verify the response carries the type, the direct-flag, and the exact list of registered members with their display names.

**Acceptance Scenarios**:

1. **Given** a Conversation exists for an assigned UUID, **When** the platform receives a room.info request for that UUID, **Then** the response carries type, direct-flag, and the registered members.
2. **Given** a room.info request references a UUID that does not correspond to any Conversation, **When** the platform processes it, **Then** the response carries an empty member list (the adapter treats this as a reconciliation abort to be retried later).

---

### Edge Cases

- **Race between Element-initiated and Alkemio-initiated DM for the same pair**: Two creation paths can race. The transactional persistence step (which assigns a unique room identifier) is the single point of truth; whichever path commits its Conversation first wins. The other path discovers the duplicate via its dedup probe and either returns the existing Conversation (Alkemio-initiated path, transparent merge) or replies "deny" (Element-initiated path, error to Element). No second Conversation is ever created.
- **Initiator's own messaging-disabled setting**: The initiator's own inbound-messaging preference is never evaluated. Opening a conversation is an explicit outbound opt-in for the initiator into that specific conversation.
- **Initiator listed in `member_actor_ids`**: Treated as a malformed payload per US7; the contract excludes the creator from the member list.
- **Empty Conversation lookup in `room.info`**: Returning an empty member list (rather than an error) is intentional — the adapter retries reconciliation on subsequent room events, so a transient miss does not block recovery.
- **Subscription fan-out fails after Conversation is persisted**: The Conversation is durably stored; the subscription failure is logged for operator triage but must not roll back the Conversation (the adapter has already received the "allow" response and is creating the Matrix room).
- **Orphaned Conversation if the adapter or Matrix never finishes reconciliation**: The Conversation exists on the platform with no message-reachable Matrix room. Cleanup is explicitly out of scope for this feature — see Assumptions; the adapter and platform together defer this to a separate future feature with a periodic cleanup job.
- **Slow platform reply**: The wire contract budgets ≤3 seconds for the platform to reply. A reply beyond that is treated as a timeout by the adapter and surfaces as a service-unavailable error to the user. The platform's own internal latency target is therefore strictly below 3 seconds.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The platform MUST expose a synchronous "room check" handler on the matrix-adapter request/reply channel. The handler accepts a creator identifier, a list of non-creator member identifiers, and a flag indicating whether the conversation is direct.
- **FR-002**: The platform MUST validate the request shape: identifiers are non-empty UUID-formatted strings; the creator is not present in the member list; the member list has no duplicates; the member count matches the type (exactly one for direct, one-or-more for group).
- **FR-003**: The platform MUST resolve the creator and every member identifier to known Alkemio users. If any identifier cannot be resolved, the platform MUST reply "deny" with a human-readable reason indicating the actor was not found.
- **FR-004**: The platform MUST evaluate the inbound-messaging preference of every non-creator member at the moment of processing the request. The creator's own preference is never evaluated.
- **FR-005**: For a direct request, the platform MUST consult the existing direct-conversation dedup helper. If a direct Conversation between the creator and the (sole) member already exists, the platform MUST reply "deny" with a human-readable reason indicating a direct conversation between these users already exists.
- **FR-006**: For a direct request, if the (sole) member has inbound messaging disabled, the platform MUST reply "deny" with a human-readable reason indicating messaging is disabled for the target user.
- **FR-007**: For a group request, if at least one non-creator member has inbound messaging enabled, the platform MUST approve the request and register the Conversation with the creator plus only the consenting members. Members with inbound messaging disabled are silently omitted from the Conversation; no wire-level metadata about the excluded members is included in the response.
- **FR-008**: For a group request where every non-creator member has inbound messaging disabled, the platform MUST reply "deny" with a human-readable reason indicating no recipients allow messaging.
- **FR-009**: On approval, the platform MUST atomically persist the Conversation, a Room whose identifier equals a freshly assigned UUID and whose type matches the request (direct/group), one membership row per registered member (creator + consenting members), and the cascaded authorization policy.
- **FR-010**: On approval, after the persistence transaction commits, the platform MUST emit the existing "conversation created" subscription event with the registered members as the fan-out set, using the same publisher that the Alkemio-initiated `createConversation` flow uses. The two creation paths MUST fire this event through a single shared call site.
- **FR-011**: The platform MUST reply to a check request within the contracted budget (≤3 seconds). Internal processing time MUST be strictly less than this budget; the adapter treats any reply beyond it as a timeout.
- **FR-012**: On any unexpected processing failure (transient persistence error, etc.), the platform MUST reply "deny" with a reason indicating an internal error and log the underlying cause at error severity with structured context. The reply MUST NOT leak internal details into the reason string.
- **FR-013**: The platform MUST expose a synchronous "room info" handler on the same channel. Given a room identifier, the handler MUST return the type (direct or group), a convenience direct-flag, and the registered members with their display names.
- **FR-014**: If the room identifier in a room.info request does not correspond to a known Conversation, the platform MUST reply with an empty member list (not an error). The convenience direct-flag in that case is false and the type field is unset or empty.
- **FR-015**: The behaviour of the existing Alkemio-initiated `createConversation` flow (client-web GraphQL mutation) MUST NOT be changed by this feature. Specifically: the existing flow's transparent "return existing Conversation on duplicate DM" behaviour is preserved, and consent enforcement is NOT added to the existing flow as part of this work.
- **FR-016**: The platform MUST NOT introduce a parallel domain method standing alongside `MessagingService.createConversation`. Shared building blocks (member normalization, count validation, dedup probe, transactional persistence, authorization-policy apply, subscription fan-out) MUST be reused across both creation paths through a single shared call site per concern.
- **FR-017**: Conversations created via this flow MUST be functionally indistinguishable from Alkemio-initiated conversations in every other platform feature that touches conversations (message sending, listing, deletion, member listing, notifications, authorization).
- **FR-018**: The platform MUST use a single shared helper for the Matrix-side displayName of any Actor, with formula `profile.displayName || nameID`. The helper MUST be invoked by (a) the new `room.info` handler introduced in this feature; (b) `UserService.syncActor` (`src/domain/community/user/user.service.ts:232-233`), replacing the current `${firstName} ${lastName} || email` formula and ELIMINATING the email-leak into Matrix; (c) `AdminCommunicationSpaceSyncService.syncDisplayNames` for both User and VirtualContributor iterations (`src/platform-admin/domain/communication/admin.communication.space.sync.service.ts:506` and `:520`); (d) `VirtualContributorService.syncActor` (`src/domain/community/virtual-contributor/virtual.contributor.service.ts:201-202`). After this feature, no call site MAY pass an actor's email or any other PII-bearing string as the Matrix-side displayName.
- **FR-019**: A Matrix user identifier received from the adapter (creator or any member) MUST be resolved against the Actor base table — any Actor subtype is acceptable (User, VirtualContributor, Organization, Space, Account). The platform MUST NOT restrict participant resolution to the User subtype: a check request for a VirtualContributor (e.g. the "guidance" assistant) is a legitimate conversation participant. The intentionally-broad allowlist is the lower-friction default: today only User and VirtualContributor have Matrix-side ghost users, so other subtypes self-exclude at the wire layer; if future features add ghost provisioning for Organization (e.g. service accounts) the server is already correct without a spec edit thanks to FR-020.
- **FR-020**: The consent gate (FR-005 / FR-006 / FR-007) applies ONLY to actors of type User. Non-User actor types have no `allowOtherUsersToSendMessages` setting and MUST be treated as consent-exempt — they are always registered into the resulting Conversation. The DM "messaging disabled" rejection (FR-006) is therefore reachable only when the (sole) DM target is a User. The group "no recipients allow messaging" rejection (FR-007) is reachable only when every non-creator group member is a User and every one denies; if any non-User actor is present, that actor alone suffices to keep the conversation alive.

### Key Entities _(include if feature involves data)_

- **Check Request**: Carries the creator identifier, the list of non-creator member identifiers, and a flag for whether the conversation is direct.
- **Check Response (approval)**: Carries the assigned room identifier (UUID) and indicates approval.
- **Check Response (rejection)**: Carries a human-readable reason and indicates rejection. No machine-readable code is required — the adapter surfaces the reason to the user verbatim.
- **Room Info Request**: Carries the assigned room identifier.
- **Room Info Response**: Carries the room identifier (echoed), the type (direct or group), a convenience direct-flag, and the registered members. Each member entry carries the actor identifier and the Matrix-side displayName, where displayName is computed by the shared helper described in FR-018 (formula: `profile.displayName || nameID`, uniform across all Actor types, with email forbidden as a fallback).
- **Conversation (existing entity, reused)**: The platform-side conversation aggregate. For this feature, created in either direct (exactly two participants — creator + the consenting target) or group (creator + one or more consenting members) form.
- **Room (existing entity, reused)**: The platform-side handle on a Matrix room. For this feature, persisted with an identifier equal to the assigned UUID rather than a freshly generated one.
- **Conversation Membership (existing entity, reused)**: One row per registered member.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At the 95th percentile, the platform replies to a check request within 1 second of receipt (well below the adapter's 3-second timeout).
- **SC-002**: 100% of approved checks result in the registered members receiving the "conversation created" notification within the same wall-clock window as the platform reply (≤5 seconds end-to-end from Element initiator action to Alkemio UI update).
- **SC-003**: When a target user has inbound messaging disabled, 100% of Element-initiated DMs targeting them are rejected with a reason that explains the rejection; zero Conversations and zero memberships are persisted in those cases.
- **SC-004**: When a strict subset of a group's invited non-initiator members has inbound messaging disabled, 100% of such groups are created with only the consenting members in the Conversation. No non-consenting member ever appears in the registered membership.
- **SC-005**: At most one direct Conversation exists between any given pair of users at all times, regardless of how many checks the adapter submits between them.
- **SC-006**: Conversations created through this feature are functionally indistinguishable from Alkemio-initiated conversations across every platform feature that touches conversations — measured by zero divergence in user-facing behaviour between the two creation paths.
- **SC-007**: Inbound requests with malformed payloads or unknown actor identifiers do not block, slow, or otherwise affect the processing of subsequent valid requests.

## Assumptions

- The Matrix homeserver only contains Alkemio ghost users; the adapter never sends a check request for an actor outside the platform's user base. The platform treats unresolved-actor cases as exceptional and rejects them under FR-003.
- The inbound-messaging preference (`User.settings.communication.allowOtherUsersToSendMessages`) already exists on every user record; this feature does not introduce a new preference.
- The existing direct-conversation dedup helper (`ConversationService.findConversationBetweenActors`) is authoritative; this feature does not introduce a competing dedup mechanism.
- The existing "conversation created" subscription publisher (`MessagingService.publishConversationCreatedEvents`) is the single fan-out point used by the Alkemio-initiated flow and is reused unchanged.
- The existing `MessagingService.createConversation` (the helper behind the Alkemio-initiated client-web flow) is the natural home for the shared logic. Both creation paths share private helpers there.
- The Matrix room is created by the homeserver immediately after the check approval and reconciled by the adapter shortly afterwards. The platform's job ends with the check reply; it does not wait for Matrix-side reconciliation to complete.
- The `room.info` handler is called once per Conversation lifecycle by the adapter during reconciliation. Long-tail retry on a missing Conversation is the adapter's responsibility; the platform's behaviour on a missing lookup is a clean empty-member response, not an error.
- Orphaned-Conversation cleanup (the case where the check is approved but Matrix-side reconciliation never completes) is explicitly out of scope. The adapter spec defers it to a future periodic cleanup job; the platform defers it identically.
- The previous async-adoption design (deleted feature `097-dm-from-element`) is not re-introduced. No migration, no backward-compatibility window.
- No GraphQL schema change is introduced by this feature; no database schema change either. The existing `Room.type` enum already distinguishes direct from group.
- The rejection reason field is a human-readable string surfaced to Element users verbatim. A closed machine-readable reason code is NOT required by the adapter contract.

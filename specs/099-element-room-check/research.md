# Research: Server-Side Synchronous Room-Check for Element-Initiated Conversations

**Feature**: `099-element-room-check` | **Phase**: 0 | **Date**: 2026-05-20

This document resolves all open decision points before Phase 1 design. Each entry records the decision, the rationale grounded in the existing codebase or the adapter contract, and alternatives that were considered and rejected.

---

## R-001: RPC handler shape

**Decision**: Use NestJS `@MessagePattern(routingKey, Transport.RMQ)` on a new lightweight controller `MatrixRoomCheckController` under `src/services/adapters/communication-adapter/`. The two new routing keys (`communication.room.check`, `communication.room.info`) each get one decorated method whose return value is automatically marshalled back as the RPC reply by NestJS's RabbitMQ transport.

**Rationale**: This is the established codebase precedent for request/reply RPC on RabbitMQ:
- `WhiteboardIntegrationController` at `src/services/whiteboard-integration/whiteboard.integration.controller.ts:39` uses `@MessagePattern(WhiteboardIntegrationMessagePattern.INFO, Transport.RMQ)` with a request/reply contract on the `alkemio-whiteboards` queue.
- `CollaborativeDocumentIntegrationController` follows the same pattern.
- Reply correlation IDs, error envelopes, and serialisation are all handled by NestJS — no manual wiring needed.

The existing `CommunicationAdapterEventService` uses `@RabbitSubscribe` from `@golevelup/nestjs-rabbitmq` for async pub/sub. That decorator is the right tool for fire-and-forget events but does NOT model the reply leg of an RPC. The two new handlers need RPC semantics (the adapter waits for the reply, with a 3s budget), so `@MessagePattern` is the correct primitive.

**Alternatives considered & rejected**:
- *Add a "reply" topic and use two `@RabbitSubscribe` decorators (one for the request, one published as reply with correlation_id)*. Rejected: re-implements what NestJS's `@MessagePattern` already gives us, adds rollover-and-correlate complexity to every call site.
- *HTTP webhook callback from server to adapter*. Rejected: inverts the dependency direction (server would need to know an adapter URL) and creates an additional infra surface to monitor.

---

## R-002: Routing key constants

**Decision**: Bump `@alkemio/matrix-adapter-lib` to a version that exposes:

```ts
MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK = 'communication.room.check';
MatrixAdapterEventType.COMMUNICATION_ROOM_INFO  = 'communication.room.info';
```

…plus the DTO type pairs `CheckRoomRequest` / `CheckRoomResponse` and `GetRoomInfoRequest` / `GetRoomInfoResponse` (matching the adapter spec field names exactly). Server PR depends on the lib release.

If the lib release slips, the server inline-defines the two routing-key strings in `src/services/adapters/communication-adapter/dto/matrix.room.check.routing.keys.ts` as a temporary bridge, with a follow-up PR to swap to lib symbols once the lib release is available. This is the same operational pattern used for past matrix-adapter-lib bumps.

**Rationale**: The lib is the source of truth for the cross-repo wire contract. Stringly-typed routing keys in feature code is exactly what the lib was built to prevent.

**Alternatives considered & rejected**:
- *Hard-code routing keys permanently*. Rejected: violates the lib's purpose; introduces contract-drift risk.
- *Defer the server work until the lib ships*. Rejected: cross-repo blocking; the inline-fallback path lets the work proceed in parallel.

---

## R-003: `CheckResult` discriminated union

**Decision**: Internal domain return type:

```ts
type CheckResult =
  | { kind: 'accepted'; alkemioRoomId: string }
  | { kind: 'rejected'; reason: string };
```

`MessagingService.createConversationFromExternal(input): Promise<CheckResult>` returns this shape. The controller translates each branch to the wire-level envelope:
- `accepted` → `{ allow: true, alkemio_room_id: <uuid> }`
- `rejected` → `{ allow: false, reason: <string> }`

**Rationale**: The discriminated union lets the domain method express success-vs-rejection without throwing — exceptions are reserved for unexpected failures (handled in the outer catch as `kind: 'rejected'` with the canonical `'internal error'` reason). The conversion at the controller boundary is one line per branch.

**Alternatives considered & rejected**:
- *Throw on rejection; controller catches and maps to wire*. Rejected: exceptions are a poor channel for expected-business-rule rejections; harder to test; conflates "consent denied" with "unexpected error".
- *Return `IConversation | null`*. Rejected: throws away the reason string entirely; the spec requires a human-readable reason on every rejection.

---

## R-004: DRY refactor — shared helpers across both creation paths

**Decision**: Extract three private helpers on `MessagingService`:

```ts
private normalizeMembers(callerActorId, memberActorIds): string[]    // dedup + remove self
private validateMembershipCount(type, normalized): void              // throws ValidationException
private async persistConversationCore(input, roomIdOverride?): Promise<IConversation>
                                                                      // wraps conversationService.createConversation + auth + room override
```

Both `createConversation` (existing client-web path) and the new `createConversationFromExternal` call these. The new wrapper adds: (a) the consent gate (a new private `evaluateMemberConsent` helper), (b) the partial-rejection arithmetic for groups, (c) the result-shape translation, and (d) the pre-assigned `roomIdOverride` parameter. Nothing else.

**Rationale**: The existing `createConversation` at `messaging.service.ts:115-187` already does ~85% of the work the new flow needs. Spec FR-016 codifies the no-parallel-method rule. Extracting helpers keeps the existing flow unchanged in behaviour (FR-015) while letting the new flow reuse the pipeline.

The consent gate is intentionally NOT applied to the existing client-web flow — that would be a user-visible behaviour change for users who currently use the GraphQL `createConversation` mutation, and adding it is out of scope per FR-015 (decision recorded in the spec's Clarifications section).

**Alternatives considered & rejected**:
- *Add an `options` bag to `createConversation` with `externalRoomId`, `enforceConsent`, `resultShape` flags*. Rejected: turns the existing method into a kitchen-sink with branching semantics. The wrapper approach keeps each entrypoint single-purpose.
- *Inline the shared logic into both methods without extracting helpers*. Rejected: directly violates FR-016.

---

## R-005: Multi-replica concurrency

**Decision**: `persistConversationCore` runs inside a single TypeORM transaction. PostgreSQL's PK uniqueness on `room.id` is the cross-replica serialization point: the losing replica gets a `UniqueViolation`, catches it, re-probes via `conversationService.findConversationByRoomId(<id>)`, and returns the existing Conversation's id.

For the Element-initiated path, this race is functionally invisible: the adapter is the only caller per `alkemio_room_id` and assigns each UUID server-side at check time, so two replicas inserting the same `room.id` would be a duplicate delivery of the same RPC request, which RabbitMQ is unlikely to produce given the request/reply pattern. Defensive though.

The more interesting race is the cross-flow one: Element-initiated DM AND Alkemio-initiated DM for the same pair created at the same instant. Both paths probe `findConversationBetweenActors` early; whichever transaction commits first wins. The second discovers the duplicate on its own dedup probe (Alkemio path returns existing; Element path returns `rejected: duplicate`).

**Rationale**: PG's PK uniqueness is the simplest concurrency primitive available and is already proven in the codebase. The cross-flow race is bounded by the existing dedup helper.

**Alternatives considered & rejected**:
- *Advisory lock keyed on `(actorA, actorB)`*. Rejected: adds infrastructure for a problem PK uniqueness already solves; serialises across replicas unnecessarily for unrelated checks.
- *Exclusive RabbitMQ consumer (only one replica handles the check queue)*. Rejected: kills horizontal scalability and creates a single point of failure for the entire check flow.

---

## R-006: displayName helper signature

**Decision**:

```ts
// src/domain/actor/actor.matrix.display.name.ts
export function getMatrixDisplayName(actor: IActor): string {
  return actor.profile?.displayName?.trim() || actor.nameID;
}
```

Pure function, no DI, no logging. Returns a non-empty string for any well-formed actor (PG schema makes both `profile.displayName` and `nameID` non-null on the canonical path).

Used at:
1. New `room.info` handler (this feature)
2. `UserService.syncActor` — replaces `${firstName} ${lastName} || email` formula at `user.service.ts:232-233` (fixes email leak)
3. `AdminCommunicationSpaceSyncService.syncDisplayNames` for both User iteration at `admin.communication.space.sync.service.ts:506` and VC iteration at `:520`
4. `VirtualContributorService.syncActor` — replaces `vc.profile?.displayName || vc.nameID` at `virtual.contributor.service.ts:201-202` (already equivalent; switched for consistency)

**Rationale**: `profile.displayName` is initialised from `${firstName} ${lastName}` at user creation time (verified at `bootstrap.service.ts:317` and `user.identity.service.ts:312`), so for default users the new uniform formula yields the same string as the current per-site formulas. It diverges only when a user later edits their profile displayName, in which case the Matrix-side name correctly follows the user's edit. Email is forbidden as a fallback (PII).

**Alternatives considered & rejected**:
- *Method on the Actor entity (`Actor.getMatrixDisplayName()`)*. Rejected: TypeORM entities should stay close to persistence concerns. A pure function on the value is more testable.
- *Per-actor-type formulas (User-specific, VC-specific, etc.)*. Rejected: re-introduces the inconsistency we're fixing. The clarification explicitly chose uniformity.

---

## R-007: Adapter-version backward compatibility

**Decision**: Clean cutover. No legacy compatibility path needed:
- The DM webhook HTTP endpoint (`/dm-request` on the adapter, called by the server's pre-async-flow client) is no longer used anywhere on the server side (replaced by the new `@MessagePattern` handler invoked from the adapter side).
- The deleted `097-dm-from-element` async topics (`communication.conversation.requested` / `.rejected`) are not in use anywhere — the feature was deleted before any code was committed.

Rolling forward installs the new handlers; the adapter's existing infrastructure picks them up automatically once the lib bump (R-002) is in place.

**Rationale**: No live traffic on legacy paths; no migration window required.

**Alternatives considered & rejected**:
- *Keep the DM webhook for a deprecation window*. Rejected: nothing on the server currently calls it; it's already inert.

---

## R-008: Rejection reason canonicalisation

**Decision**: A small const-map in `src/domain/communication/messaging/types/messaging.rejection.reasons.ts` holds the canonical human-readable strings:

```ts
export const MessagingRejectionReason = {
  ACTOR_NOT_FOUND: 'actor not found',
  MESSAGING_DISABLED: 'messaging disabled for the target user',
  NO_RECIPIENTS_ALLOW_MESSAGING: 'no recipients allow messaging',
  DUPLICATE_DIRECT_CONVERSATION:
    'a direct conversation between these users already exists',
  INTERNAL_ERROR: 'internal error',
  MALFORMED_REQUEST: 'malformed check request',
} as const;
```

Domain code references the constant; the controller emits `result.reason` verbatim on the wire. Tests assert against the constants, not raw strings — so a wording refactor stays a single-file edit.

**Rationale**: The spec deliberately chose human-readable reason strings over a closed machine-readable code (the adapter contract surfaces the reason to Element users verbatim). The const-map gives us internal type safety without sacrificing the freedom to revise the user-facing wording.

**Alternatives considered & rejected**:
- *Raw inline string literals at every rejection site*. Rejected: typos become silent bugs surfaced only in tests; harder to localise later if we decide to.
- *A closed enum + per-locale message resource*. Rejected: localisation is explicitly out of scope; the adapter contract requires a string, not a code, and a single English wording is sufficient for V1.

---

## Resolved → no remaining NEEDS CLARIFICATION

All eight items above are resolved. No `NEEDS CLARIFICATION` markers remain in any plan artefact.

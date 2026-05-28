# Contract: Room Check RabbitMQ RPC

**Feature**: `099-element-room-check` | **Phase**: 1 | **Date**: 2026-05-20

> **Authoritative source**: `alkem-io/matrix-adapter-go` — `specs/050-element-room-check/contracts/room-check-rabbitmq.md`.
> This file mirrors that contract verbatim from the server-side consumer perspective. **Any divergence is a bug.** If a delta is intentional, it MUST first be agreed in the adapter contract document; this file then re-syncs.

## Wire envelope

- **Direction**: Adapter → Server (request/reply)
- **Topic / routing key**: `communication.room.check`
- **Pattern**: AMQP RPC (temporary exclusive reply queue, `correlation_id` set by the adapter)
- **Server handler**: `MatrixRoomCheckController.checkRoom` decorated with `@RabbitRPC` from `@golevelup/nestjs-rabbitmq` keyed on `MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK`. NestJS's `@MessagePattern + Transport.RMQ` would create a competing consumer that steals messages from the existing `@RabbitSubscribe` consumers on the matrix-adapter queue (see `main.ts:110-112`), so the golevelup decorator family is used uniformly.
- **Timeout**: Adapter waits up to **3 seconds** for the server reply. Server's internal target (per SC-001): p95 ≤ 1 second.

## Request (Adapter publishes)

```json
{
  "creator_actor_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "member_actor_ids": ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"],
  "is_direct": true
}
```

| Field | Type | Constraints (enforced by server validation) |
|---|---|---|
| `creator_actor_id` | string (UUID) | Non-empty, UUID-shaped, MUST resolve to a known Alkemio actor. |
| `member_actor_ids` | string (UUID)[] | Non-empty array; UUID-shaped entries; MUST NOT contain `creator_actor_id`; MUST contain no duplicates; for `is_direct=true` length is exactly 1; for `is_direct=false` length is ≥ 1; all entries MUST resolve to known Alkemio actors. |
| `is_direct` | bool | `true` for DM, `false` for group. |

## Response — `allow: true`

```json
{
  "allow": true,
  "alkemio_room_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

The server assigns a fresh UUID, persists the Conversation entity, and returns the UUID. The adapter uses this UUID as the content of the `io.alkemio.pending` state event in the just-approved Matrix room creation; later, during reconciliation, it queries `communication.room.info` keyed by this UUID.

## Response — `allow: false`

```json
{
  "allow": false,
  "reason": "<human-readable string>"
}
```

The `reason` is one of the canonical strings from `MessagingRejectionReason`:

| Internal constant | Wire string | Triggered when |
|---|---|---|
| `ACTOR_NOT_FOUND` | `"actor not found"` | Initiator or any member id doesn't resolve to an actor |
| `MESSAGING_DISABLED` | `"messaging disabled for the target user"` | DM target has `allowOtherUsersToSendMessages = false` |
| `NO_RECIPIENTS_ALLOW_MESSAGING` | `"no recipients allow messaging"` | All non-creator group members have the setting off |
| `DUPLICATE_DIRECT_CONVERSATION` | `"a direct conversation between these users already exists"` | DM dedup hit |
| `MALFORMED_REQUEST` | `"malformed check request"` | Validation rule violated (shape, count-vs-type mismatch, etc.) |
| `INTERNAL_ERROR` | `"internal error"` | Transient unexpected failure (cause logged at ERROR with `details`) |

The adapter surfaces this string verbatim to the user via Element. No translation, no machine-readable code.

## Response — error envelopes

Standard NestJS RPC error semantics. The adapter contract maps server-side exceptions to:
- HTTP 500 surfaced as 503 to Element (if the server replies with a NestJS RPC error)
- HTTP 504 surfaced as 503 to Element (if the server doesn't reply within 3s)

In practice the server should NEVER throw to the wire — every business-rule rejection is conveyed as `allow: false`, and unexpected failures are caught and returned as `allow: false, reason: 'internal error'` (per FR-012).

## Server-side handler contract

Pseudocode:

```ts
@RabbitRPC({
  queue: MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK,
  routingKey: MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK,
  createQueueIfNotExists: true,
  queueOptions: { durable: true },
})
async checkRoom(payload: CheckRoomRequest): Promise<CheckRoomResponse> {
  const result = await this.messagingService.createConversationFromExternal({
    creatorActorId: payload.creator_actor_id,
    memberActorIds: payload.member_actor_ids,
    isDirect: payload.is_direct,
  });
  return result.kind === 'accepted'
    ? { allow: true, alkemio_room_id: result.alkemioRoomId }
    : { allow: false, reason: result.reason };
}
```

The handler is a thin orchestrator. All business rules live in `MessagingService.createConversationFromExternal`. See `data-model.md` for the per-branch behaviour.

## Versioning policy

This contract is co-owned with `matrix-adapter-go`. The two specs MUST agree on field names, field types, routing keys, and rejection semantics. Changes MUST be made in lockstep with the corresponding edit to `matrix-adapter-go/specs/050-element-room-check/contracts/room-check-rabbitmq.md`. The `@alkemio/matrix-adapter-lib` package is the source of truth for the routing-key constant.

# Contract: Get Room Info RabbitMQ RPC

**Feature**: `099-element-room-check` | **Phase**: 1 | **Date**: 2026-05-20

> **Authoritative source**: `alkem-io/matrix-adapter-go` — `specs/050-element-room-check/contracts/room-info-rabbitmq.md`.
> This file mirrors that contract verbatim from the server-side consumer perspective. **Any divergence is a bug.**

## Wire envelope

- **Direction**: Adapter → Server (request/reply)
- **Topic / routing key**: `communication.room.info`
- **Pattern**: AMQP RPC (temporary exclusive reply queue, `correlation_id` set by the adapter)
- **Server handler**: `MatrixRoomCheckController.getRoomInfo` decorated with `@RabbitRPC` from `@golevelup/nestjs-rabbitmq` keyed on `MatrixAdapterEventType.COMMUNICATION_ROOM_INFO` (same rationale as the check handler — see room-check-rabbitmq.md)
- **Timeout**: Adapter waits up to 3 seconds. On timeout the adapter aborts reconciliation; the `io.alkemio.pending` marker remains and reconciliation is retried on a subsequent event in that room.

## Request (Adapter publishes)

```json
{
  "alkemio_room_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| Field | Type | Description |
|---|---|---|
| `alkemio_room_id` | string (UUID) | The UUID assigned at check time (i.e., the `Room.id` on the server side). |

## Response

```json
{
  "alkemio_room_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "type": "conversation_direct",
  "is_direct": true,
  "members": [
    { "actor_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "display_name": "Jane Doe" },
    { "actor_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy", "display_name": "John Smith" }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `alkemio_room_id` | string (UUID) | Echo of the requested UUID. |
| `type` | string | `"conversation_direct"` or `"conversation_group"`. Empty string on miss. |
| `is_direct` | bool | Convenience flag — `true` iff type is `"conversation_direct"`. `false` on miss. |
| `members` | object[] | One entry per `ConversationMembership` actually persisted on the Conversation. **For partial-rejection groups, this is the consenting subset only** — non-consenting members were never registered and never appear here. |
| `members[].actor_id` | string (UUID) | The actor id. |
| `members[].display_name` | string | Result of `getMatrixDisplayName(actor)` (formula `profile.displayName || nameID`, per FR-018). |

## Miss response (Conversation not found)

```json
{
  "alkemio_room_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "type": "",
  "is_direct": false,
  "members": []
}
```

This is NOT an error envelope — the response is 200-equivalent. The empty `members[]` signals to the adapter that reconciliation should be aborted for now (and retried on a subsequent event in that room).

## Server-side handler contract

Pseudocode:

```ts
@RabbitRPC({
  queue: MatrixAdapterEventType.COMMUNICATION_ROOM_INFO,
  routingKey: MatrixAdapterEventType.COMMUNICATION_ROOM_INFO,
  createQueueIfNotExists: true,
  queueOptions: { durable: true },
})
async getRoomInfo(payload: GetRoomInfoRequest): Promise<GetRoomInfoResponse> {
  const result = await this.messagingService.getRoomInfo(payload.alkemio_room_id);
  return {
    alkemio_room_id: payload.alkemio_room_id,
    type: result.type,
    is_direct: result.isDirect,
    members: result.members.map(m => ({
      actor_id: m.actorId,
      display_name: m.displayName,
    })),
  };
}
```

The handler is a one-line passthrough. The domain method:
1. Looks up the Conversation by `Room.id = alkemio_room_id`.
2. If missing, returns the empty envelope.
3. If found, loads the membership list with each member's `profile` (lightweight), maps each to `{ actor_id, display_name: getMatrixDisplayName(actor) }`.

## Use during reconciliation (informational, owned by adapter)

After Synapse creates the room with the `io.alkemio.pending` marker (containing `alkemio_room_id`), the adapter:
1. Detects the marker on the `m.room.create` event.
2. Calls `communication.room.info` keyed by the marker's UUID.
3. Uses the returned member list to:
   - `EnsureUser` each member (with `display_name` for the Matrix profile)
   - `EnsureJoined` each member (direct-join, no invite events)
   - Set `m.direct` account data for both participants (if `is_direct: true`)
4. Sets the canonical room alias to the assigned UUID.
5. Emits the standard `communication.room.created` event so the server's existing handler fires platform-level subscriptions for any downstream consumer (e.g. dashboards). NOTE: the `conversationCreated` GraphQL subscription is fired by the server at check time, not in response to room.created — see `research.md` R-006 in the deleted `097` spec history if you want the trade-off rationale, or simply observe that the publisher is co-located with the persistence step inside `createConversationFromExternal`.

## Versioning policy

Same as `room-check-rabbitmq.md` — co-owned with the matrix-adapter-go repo; changes are lockstep.

# Quickstart: Server-Side Element Room-Check

**Feature**: `099-element-room-check` | **Phase**: 1 | **Date**: 2026-05-20

A local-test runbook for hand-driving the two RPC handlers without needing a working Element / Synapse / matrix-adapter-go installation. Useful for verifying server-side handler behaviour during development and review.

## Prerequisites

```bash
# From repo root
pnpm install
pnpm run start:services           # PostgreSQL 17.5, RabbitMQ, Redis, Kratos, Oathkeeper
pnpm run migration:run            # No new migrations for this feature; runs existing chain
pnpm run start:dev                # Server with hot reload on :4000
```

Two Alkemio users must already exist in the dev DB. Note their actor ids:

```sql
SELECT a.id, a."nameID", p."displayName"
FROM actor a JOIN profile p ON p.id = a."profileId"
WHERE a.type = 'user'
ORDER BY a."createdDate" DESC LIMIT 5;
```

Pick two: call them `CREATOR_ID` and `TARGET_ID`. Verify their consent setting:

```sql
SELECT a.id, u.settings->'communication'->>'allowOtherUsersToSendMessages' AS allow
FROM actor a JOIN "user" u ON u.id = a.id
WHERE a.id IN ('CREATOR_ID','TARGET_ID');
```

## Test 1 — DM happy path

Pre-condition: `TARGET_ID` has `allowOtherUsersToSendMessages = true`; no existing direct conversation between the two.

The two new RPC handlers use NestJS request/reply over RabbitMQ. The cleanest way to hand-drive them from the shell is `rabbitmqadmin publish` with `reply_to` set to a temporary queue you tail concurrently. Or use the helper script `.scripts/rmq-rpc.sh` (if present) — pseudocode here:

```bash
PAYLOAD='{"creator_actor_id":"'$CREATOR_ID'","member_actor_ids":["'$TARGET_ID'"],"is_direct":true}'
rmq-rpc.sh communication.room.check "$PAYLOAD"
# expected reply: { "allow": true, "alkemio_room_id": "<uuid>" }
```

Capture the assigned UUID as `ROOM_ID`.

Verify:

```sql
SELECT c.id, c."roomId", r.type, r."displayName"
FROM conversation c JOIN room r ON r.id = c."roomId"
WHERE c."roomId" = '<ROOM_ID>';
-- expect: 1 row, type=conversation_direct, displayName=''

SELECT * FROM conversation_membership WHERE "conversationId" = (
  SELECT id FROM conversation WHERE "roomId" = '<ROOM_ID>'
);
-- expect: 2 rows, one per actor id
```

Tail server log for `LogContext.COMMUNICATION_CONVERSATION` — expect one `verbose` line confirming the create path.

## Test 2 — DM denied (consent off)

Flip the target's setting:

```sql
UPDATE "user" SET settings = jsonb_set(settings, '{communication,allowOtherUsersToSendMessages}', 'false')
WHERE id = '<TARGET_ID>';
```

Publish the same payload shape (different `CREATOR_ID`/`TARGET_ID` pair if a Conversation now exists from Test 1):

```bash
rmq-rpc.sh communication.room.check "$PAYLOAD"
# expected reply: { "allow": false, "reason": "messaging disabled for the target user" }
```

Verify no Conversation persisted:

```sql
SELECT count(*) FROM conversation
WHERE "createdDate" > NOW() - INTERVAL '1 minute'
  AND id NOT IN (SELECT id FROM conversation WHERE "createdDate" < NOW() - INTERVAL '1 minute');
-- expect: 0
```

## Test 3 — Group partial rejection

Pre-conditions: three users — `CREATOR_ID`, `A_ID` (consent true), `B_ID` (consent false).

```bash
PAYLOAD='{"creator_actor_id":"'$CREATOR_ID'","member_actor_ids":["'$A_ID'","'$B_ID'"],"is_direct":false}'
rmq-rpc.sh communication.room.check "$PAYLOAD"
# expected reply: { "allow": true, "alkemio_room_id": "<uuid>" }
```

Capture the assigned UUID as `ROOM_ID`. Verify the Conversation has exactly two memberships — creator + A only, B is omitted:

```sql
SELECT "actorId" FROM conversation_membership WHERE "conversationId" = (
  SELECT id FROM conversation WHERE "roomId" = '<ROOM_ID>'
);
-- expect: 2 rows (CREATOR_ID, A_ID); NOT B_ID
```

## Test 4 — DM duplicate

Repeat the same payload from Test 1 (CREATOR_ID + TARGET_ID, both consenting, Conversation already exists from Test 1):

```bash
rmq-rpc.sh communication.room.check "$PAYLOAD"
# expected reply: { "allow": false, "reason": "a direct conversation between these users already exists" }
```

Verify no second Conversation:

```sql
SELECT count(*) FROM conversation_membership cm
WHERE cm."actorId" IN ('<CREATOR_ID>','<TARGET_ID>')
GROUP BY cm."conversationId";
-- expect: exactly one conversation grouping with both actors
```

## Test 5 — room.info lookup

For a known `<ROOM_ID>` from Test 1 or Test 3:

```bash
PAYLOAD='{"alkemio_room_id":"<ROOM_ID>"}'
rmq-rpc.sh communication.room.info "$PAYLOAD"
# expected reply: { "alkemio_room_id": "<ROOM_ID>", "type": "conversation_direct"|"conversation_group", "is_direct": true|false, "members": [{"actor_id":..., "display_name":...}, ...] }
```

Verify the `display_name` values match `getMatrixDisplayName(actor)` (i.e., each actor's `profile.displayName || nameID`).

For a non-existent UUID:

```bash
PAYLOAD='{"alkemio_room_id":"00000000-0000-0000-0000-000000000000"}'
rmq-rpc.sh communication.room.info "$PAYLOAD"
# expected reply: { "alkemio_room_id": "00000000-...", "type": "", "is_direct": false, "members": [] }
```

## Cleanup

```bash
docker compose -f quickstart-services.yml down
```

## Acceptance checklist

- [ ] Tests 1–5 each behave as described above against a fresh local environment.
- [ ] `pnpm lint` clean.
- [ ] `pnpm test -- src/services/adapters/communication-adapter/matrix.room.check.controller.spec.ts src/domain/communication/messaging/messaging.service.spec.ts src/domain/actor/actor.matrix.display.name.spec.ts` all green, covering the 23 rows of the test matrix in `data-model.md`.
- [ ] Tail of server log shows static exception messages with dynamic ids in `details` (Constitution §5).
- [ ] No `email` field appears in any matrix-bound payload (FR-018 audit: grep for `email` references in `getMatrixDisplayName` callers).

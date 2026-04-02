# Data Model: Room Handling During Cross-Space Moves

**Feature**: 084-move-room-handling
**Date**: 2026-03-30

## Entity Impact Analysis

This feature introduces **no new entities** and **no schema migrations**. All changes operate on existing entities through their established relationships.

### Existing Entities (Unchanged Schema)

#### Room (`src/domain/communication/room/room.entity.ts`)

| Field | Type | Nullable | Move Impact |
|-------|------|----------|-------------|
| `id` | UUID (PK) | false | Used as `AlkemioRoomID` for adapter calls |
| `messagesCount` | int | false | Preserved — derived from adapter on next query |
| `type` | RoomType enum | false | Used to distinguish room treatment (CALLOUT/POST preserved, UPDATES recreated) |
| `displayName` | varchar | false | Preserved for callout/post rooms. New name (`updates-{spaceName}`) for recreated updates rooms |
| `avatarUrl` | varchar | true | Preserved for callout/post rooms. Reset for recreated updates rooms |
| `vcData` | jsonb | true | Preserved for callout/post rooms. Reset (`{}`) for recreated updates rooms |

**Relationships (unchanged)**:
- `Callout.comments` (OneToOne inverse) — links room to a callout's discussion
- `Post.comments` (OneToOne inverse) — links room to a post's comment thread

**Move behavior**: Callout/post Room entities survive automatically — they follow their parent entities through the FK chain. No FK updates needed. Updates Room is deleted and recreated.

#### Communication (`src/domain/communication/communication/communication.entity.ts`)

| Field | Type | Nullable | Move Impact |
|-------|------|----------|-------------|
| `id` | UUID (PK) | false | Unchanged |
| `spaceID` | varchar (UUID) | false | Unchanged (follows space) |
| `displayName` | varchar | false | Unchanged |
| `updates` | OneToOne -> Room (eager, cascade) | false | **Modified**: Old room deleted, new room linked |

**Move behavior**: Communication entity itself is not re-created. Its `updates` FK is updated to point to a newly created empty Room entity.

### RoomType Enum (unchanged)

| Value | Context | Move Behavior |
|-------|---------|---------------|
| `CALLOUT` | Callout discussion comments | **Preserved** (room + messages intact, memberships revoked) |
| `POST` | Post contribution comments | **Preserved** (room + messages intact, memberships revoked) |
| `UPDATES` | Community announcements | **Recreated** (deleted and recreated empty) |
| `CONVERSATION_*` | DMs, group chats | Not affected by space moves |

## Entity Relationship Graph (Move Context)

```text
Space (moved) ─────────────────────────────────────────────
│
├── Collaboration
│   └── CalloutsSet
│       └── Callout[]
│           ├── comments: Room [CALLOUT] ── PRESERVE (revoke memberships)
│           └── contributions[]
│               └── Post[]
│                   └── comments: Room [POST] ── PRESERVE (revoke memberships)
│
├── Community
│   └── Communication
│       └── updates: Room [UPDATES] ── DELETE + RECREATE EMPTY
│
└── subspaces: Space[] ── RECURSE (same treatment at each level)
```

## Query Patterns

### 1. Room ID Collection (read-only, `collectAllRoomIdsInSubtree`)

Three parallel queries via `Promise.all`, using raw `QueryBuilder`:

```sql
-- Callout discussion rooms
SELECT r.id FROM room r
  INNER JOIN callout c ON c."commentsId" = r.id
  INNER JOIN callouts_set cs ON cs.id = c."calloutsSetId"
  INNER JOIN collaboration col ON col."calloutsSetId" = cs.id
  INNER JOIN space s ON s."collaborationId" = col.id
WHERE s.id IN (:...spaceIds);

-- Post comment rooms
SELECT r.id FROM room r
  INNER JOIN post p ON p."commentsId" = r.id
  INNER JOIN callout_contribution cc ON cc."postId" = p.id
  INNER JOIN callout c ON c.id = cc."calloutId"
  INNER JOIN callouts_set cs ON cs.id = c."calloutsSetId"
  INNER JOIN collaboration col ON col."calloutsSetId" = cs.id
  INNER JOIN space s ON s."collaborationId" = col.id
WHERE s.id IN (:...spaceIds);

-- Updates rooms
SELECT r.id FROM room r
  INNER JOIN communication comm ON comm."updatesId" = r.id
WHERE comm."spaceID" IN (:...spaceIds);
```

Results are deduplicated via `Set<string>`.

### 2. Communication Lookup (`getCommunicationsWithUpdatesRooms`)

```sql
SELECT comm.id AS "communicationId",
       comm."updatesId" AS "updatesRoomId",
       comm."spaceID" AS "spaceId",
       comm."displayName" AS "displayName"
FROM communication comm
WHERE comm."spaceID" IN (:...spaceIds)
  AND comm."updatesId" IS NOT NULL;
```

## State Transitions

### Room Lifecycle During Move

```text
[Before Move]                              [After Move]
  Callout Room: has members, has messages → exists, NO members, messages PRESERVED
  Post Room:    has members, has messages → exists, NO members, messages PRESERVED
  Updates Room: has members, has messages → NEW room (empty), NO members, NO messages

[Post-Move Join (new community members)]
  Callout/Post Rooms: new members added via Matrix space hierarchy → can read ALL history + write new
  Updates Room:       new members added via batchAddMember → receive new announcements
```

### Matrix Membership States per Actor

```text
                          batchRemoveMember
  Room member ──────────────────────────────────► Not a member (cannot write)

                          batchRemoveSpaceMember
  Space member ─────────────────────────────────► Not a space member (cannot access child rooms)

                          batchAddMember + batchAddSpaceMember (on new community join)
  Not a member ─────────────────────────────────► Full member (read history + write)
```

## External System Impact

### Matrix/Synapse (via Go Matrix Adapter over AMQP RPC)

| Operation | Method | Call Pattern | Error Handling |
|-----------|--------|--------------|----------------|
| Revoke room membership | `batchRemoveMember(actorId, roomIds[], reason)` | Per-actor, O(actors) calls | Fire-and-forget, logged |
| Revoke space membership | `batchRemoveSpaceMember(actorId, spaceIds[], reason)` | Per-actor, O(actors) calls | Fire-and-forget, logged |
| Delete updates room | `deleteRoom(roomId)` | Per-communication | Awaited, caught per-space |
| Create updates room | `createRoom(roomId, UPDATES, name)` | Per-communication | Awaited, caught per-space |

## Validation Rules

No new schema-level validation. All validation is in service logic:

- `spaceIds` array: Short-circuits to `[]` if empty (no DB query issued)
- `removedActorIds`: May be empty (legitimate case: no members to revoke)
- `communicationId`: Must resolve to existing Communication entity (`getCommunicationOrFail` throws)
- Room deletion: Requires valid `roomID` (validated by `RoomService.deleteRoom`)
- Room creation: Room entity saved to DB before adapter call (two-phase: DB first, then Matrix)

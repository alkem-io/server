# Data Model: Room Handling During Cross-Space Moves

**Date**: 2026-03-30 | **Branch**: `084-move-room-handling`

## Entity Impact Analysis

This feature introduces **no new entities** and **no schema migrations**. All changes operate on existing entities and external systems.

### Existing Entities (Unchanged Schema)

#### Room (`src/domain/communication/room/room.entity.ts`)

| Field | Type | Impact |
|-------|------|--------|
| `id` | `UUID` | Used as `AlkemioRoomID` for adapter calls |
| `messagesCount` | `number` | Preserved — derived from adapter on next query |
| `type` | `RoomType` enum | Used to filter room types during collection |
| `displayName` | `string` | Preserved for callout/post rooms. New name for recreated updates rooms. |
| `vcData` | `JSONB (VcData)` | Preserved for callout/post rooms. Reset for recreated updates rooms. |
| `comments → Callout` | `@OneToOne` | Relationship preserved — callout entity follows space during move |
| `comments → Post` | `@OneToOne` | Relationship preserved — post entity follows callout during move |

**Move behavior**: Callout/post Room entities survive the move automatically — they follow their parent Callout/Post entities, which follow the CalloutsSet → Collaboration → Space. No FK updates needed.

**Updates Room**: The Communication entity's updates Room is **deleted and recreated**. The old Room entity is removed from DB and Matrix. A new Room entity is created with `type: RoomType.UPDATES` and linked to the Communication.

#### Communication (`src/domain/communication/communication/communication.entity.ts`)

| Field | Type | Impact |
|-------|------|--------|
| `id` | `UUID` | Unchanged |
| `spaceID` | `UUID` | Unchanged (follows space) |
| `displayName` | `string` | Unchanged |
| `updates` | `@OneToOne → Room` | **Modified**: Old room deleted, new room linked |

**Move behavior**: Communication entity itself is not modified. Its `updates` relationship is updated to point to the new empty Room entity.

#### Callout (`src/domain/collaboration/callout/callout.entity.ts`)

| Field | Type | Impact |
|-------|------|--------|
| `comments` | `@OneToOne → Room` (eager, cascade) | Unchanged — Room entity preserved |

**Move behavior**: Callout follows CalloutsSet → Collaboration → Space. The `comments` Room FK stays intact.

#### Post (`src/domain/collaboration/post/post.entity.ts`)

| Field | Type | Impact |
|-------|------|--------|
| `comments` | `@OneToOne → Room` (eager, cascade) | Unchanged — Room entity preserved |

**Move behavior**: Post follows Callout → CalloutsSet → Space. The `comments` Room FK stays intact.

### RoomType Enum (`src/common/enums/room.type.ts`)

No changes to the enum. Relevant types for this feature:

| Value | Context | Move Behavior |
|-------|---------|---------------|
| `CALLOUT` | Callout discussion comments | Preserved (room + messages) |
| `POST` | Post contribution comments | Preserved (room + messages) |
| `UPDATES` | Community announcements | Deleted and recreated empty |

Types NOT affected by moves: `CONVERSATION`, `CONVERSATION_DIRECT`, `CONVERSATION_GROUP`, `DISCUSSION_FORUM`, `CALENDAR_EVENT`.

## Relationship Diagram

```
Space (moved)
├── Community
│   └── Communication
│       └── updates: Room [UPDATES] ──── DELETE + RECREATE
├── Collaboration
│   └── CalloutsSet
│       └── Callout[]
│           ├── comments: Room [CALLOUT] ──── PRESERVE (revoke memberships)
│           └── contributions: Post[]
│               └── comments: Room [POST] ──── PRESERVE (revoke memberships)
└── subspaces: Space[] ──── RECURSE (same treatment for L2 children)
```

## External System Impact

### Matrix/Synapse (via Go Matrix Adapter over AMQP RPC)

| Operation | Target | Method | Behavior |
|-----------|--------|--------|----------|
| Revoke room membership | All rooms in subtree | `batchRemoveMember(actorID, roomIds[])` | Per-actor, fire-and-forget |
| Revoke space membership | All Matrix spaces in subtree | `batchRemoveSpaceMember(actorID, contextIds[])` | Per-actor, fire-and-forget |
| Delete updates room | Old updates Room | `deleteRoom(roomId)` | Removes Matrix room |
| Create updates room | New updates Room | `createRoom(roomId, UPDATES, name)` | Creates fresh Matrix room |

### Room ID Collection Query

To collect all room IDs in a space subtree, the service needs to query across the entity graph:

```sql
-- Callout rooms for spaces
SELECT r.id FROM room r
  JOIN callout c ON c."commentsId" = r.id
  JOIN callouts_set cs ON cs.id = c."calloutsSetId"
  JOIN collaboration col ON col."calloutsSetDefaultId" = cs.id
                         OR col."calloutsSetKnowledgeId" = cs.id
  JOIN space s ON s."collaborationId" = col.id
WHERE s.id IN (:...spaceIds)

-- Post rooms for spaces
SELECT r.id FROM room r
  JOIN post p ON p."commentsId" = r.id
  JOIN callout_contribution cc ON cc."postId" = p.id
  JOIN callout c ON c.id = cc."calloutId"
  JOIN callouts_set cs ON cs.id = c."calloutsSetId"
  JOIN collaboration col ON col."calloutsSetDefaultId" = cs.id
                         OR col."calloutsSetKnowledgeId" = cs.id
  JOIN space s ON s."collaborationId" = col.id
WHERE s.id IN (:...spaceIds)

-- Updates rooms for spaces
SELECT r.id FROM room r
  JOIN communication comm ON comm."updatesId" = r.id
WHERE comm."spaceID" IN (:...spaceIds)
```

These queries will be implemented using TypeORM QueryBuilder in the new service, parameterized by the list of space IDs (moved space + all descendants from `spaceLookupService.getAllDescendantSpaceIDs()`).

## State Transitions

```
BEFORE MOVE:
  Room (CALLOUT/POST): members = [user1, user2, user3, ...]
  Room (UPDATES):      members = [user1, user2, user3, ...]
  Matrix Space:        members = [user1, user2, user3, ...]

DURING MOVE (after community clearing):
  Room (CALLOUT/POST): members = [user1, user2, user3, ...] → [] (revoked async)
  Room (UPDATES):      DELETED → NEW ROOM (empty)
  Matrix Space:        members = [user1, user2, user3, ...] → [] (revoked async)

AFTER MOVE (new members join):
  Room (CALLOUT/POST): members = [newUser1, newUser2, ...] (via Matrix space hierarchy)
  Room (UPDATES):      members = [newUser1, newUser2, ...] (via addContributorToCommunications)
  Matrix Space:        members = [newUser1, newUser2, ...] (via community join flow)
```

## Validation Rules

- **Pre-move**: No additional validation for room handling (083 handles space-level validation)
- **Post-move**: The new updates room must be successfully created in DB before the adapter call. If DB creation fails, the Communication entity retains the old room (graceful degradation).
- **Room ID collection**: Must include ALL rooms in the subtree (not just the moved space). Uses `getAllDescendantSpaceIDs()` to ensure completeness.

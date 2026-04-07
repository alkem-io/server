# Data Model: Matrix Space Lifecycle Management

**Branch**: `082-matrix-space-lifecycle` | **Date**: 2026-03-25

## Entity Changes

### No New Database Entities Required

The Go Matrix Adapter manages the mapping between Alkemio UUIDs and Matrix space/room IDs internally. No new columns, tables, or entities are needed in the Alkemio server database.

### Context ID Mapping Strategy

Matrix space operations use Alkemio entity IDs as `alkemioContextId`:

| Alkemio Entity | Context ID Used | Source |
|---------------|----------------|--------|
| Space (L0/L1/L2) | `space.id` (Actor UUID) | `Space.id` from CTI |
| Forum | `forum.id` (UUID) | `Forum.id` |
| Forum Category | UUID v5 derived from `${forum.id}:category:${categoryName}` | Deterministic UUID via `uuid` v5 (namespace-based) |
| Room | `room.id` (UUID) | `Room.id` (already used) |

### Existing Entity Reference

#### Space (extends Actor via CTI)
- `id` (uuid, PK) — used as Matrix space context ID
- `parentSpace` (ManyToOne → Space) — determines Matrix hierarchy parent
- `level` (int) — SpaceLevel L0/L1/L2
- `levelZeroSpaceID` (uuid) — root space reference
- `about.profile.displayName` — synced to Matrix space name
- `about.profile.visuals[AVATAR]` — synced to Matrix space avatar
- `community.communication.updates` (Room) — anchored to Matrix space

#### Forum
- `id` (uuid, PK) — used as Matrix space context ID for forum container
- `discussionCategories` (string[]) — used to derive category context IDs
- `discussions` (Discussion[]) — rooms anchored under category Matrix spaces

#### Discussion
- `category` (string) — determines which category Matrix space to anchor under
- `comments` (Room) — the actual Matrix room, anchored to category Matrix space

#### Room
- `id` (uuid, PK) — already used as `alkemioRoomId` for Matrix room operations
- `type` (RoomType enum) — determines if room needs public visibility (DISCUSSION_FORUM → yes)
- `displayName` (string) — synced to Matrix room name

## Hierarchy Mapping

```
Alkemio Hierarchy                    Matrix Hierarchy
─────────────────                    ────────────────
Space L0                          →  Matrix Space (contextId = space.id)
  ├── Space L1                    →    ├── Matrix Space (contextId = subspace.id)
  │   └── Space L2                →    │   └── Matrix Space (contextId = sub-subspace.id)
  │       ├── Updates Room        →    │       ├── Matrix Room (anchored via setParent)
  │       └── Callout Rooms       →    │       └── Matrix Rooms (anchored via setParent)
  ├── Forum                       →    ├── Matrix Space (contextId = forum.id)
  │   ├── Category "General"      →    │   ├── Matrix Space (contextId = uuidv5("forum.id:category:General"))
  │   │   └── Discussion Room     →    │   │   └── Matrix Room (public, anchored)
  │   └── Category "Ideas"        →    │   └── Matrix Space (contextId = uuidv5("forum.id:category:Ideas"))
  │       └── Discussion Room     →    │       └── Matrix Room (public, anchored)
  └── Updates Room                →    └── Matrix Room (anchored via setParent)
```

## Visibility Rules

### Join Rules (Matrix Protocol Level)

| Matrix Entity Type | Join Rule | Reason |
|-------------------|-----------|--------|
| Space container (L0/L1/L2) | Invite-only | Membership management deferred to future PR |
| Forum Matrix space | Public (Synapse users) | FR-017 |
| Category Matrix space | Public (Synapse users) | FR-017 |
| Discussion room | Public (Synapse users) | FR-011 |
| Updates room | Unchanged (existing behavior) | FR-012 |
| Callout/Post rooms | Unchanged (existing behavior) | FR-012 |
| Conversation rooms | Unchanged (existing behavior) | FR-012 |

### Sync Visibility (Synapse Module Level)

Non-forum rooms are hidden from Element clients via the `io.alkemio.visibility` custom state event, enforced by the `AlkemioRoomControl` Synapse module.

| Matrix Entity Type | `io.alkemio.visibility` | Appears in `/sync` | Reason |
|-------------------|------------------------|--------------------|--------|
| Forum rooms | Not set (or `{"visible": true}`) | Yes | FR-011: publicly accessible |
| Forum/Category Matrix spaces | Not set | Yes | FR-017: discoverable |
| Updates room | `{"visible": false}` | No (hidden) | FR-019: managed by Alkemio |
| Callout/Post rooms | `{"visible": false}` | No (hidden) | FR-019: managed by Alkemio |
| Conversation rooms | `{"visible": false}` | No (hidden) | FR-019: managed by Alkemio |

**AppService bot exemption**: The bot user (`@00000000-...:alkemio.matrix.host`) is never filtered — it sees all rooms for management operations (FR-020).

### Room Directory Publication

Only the AppService bot can publish rooms to the Synapse public room directory (FR-021). Configured via `room_list_publication_rules` in `homeserver.yaml`.

```yaml
room_list_publication_rules:
  - user_id: "@00000000-0000-0000-0000-000000000000:alkemio.matrix.host"
    action: allow
  - action: deny
```

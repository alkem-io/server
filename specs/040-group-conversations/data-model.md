# Data Model: Group Conversations & Unified Messaging API

**Feature**: 040-group-conversations
**Date**: 2026-03-04

## Entity Changes

### Conversation (unchanged)

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| id | UUID | existing | PK from AuthorizableEntity |
| authorization | AuthorizationPolicy | existing | |
| memberships | ConversationMembership[] | existing | 1-to-many via pivot table |
| messaging | Messaging | existing | Many-to-1 to platform Messaging singleton |
| room | Room | existing | 1-to-1, cascade. Room's `type` is the single source of truth for direct vs group. |

No schema changes to the Conversation entity. The `CommunicationConversationType` enum is **removed entirely** — direct vs group is determined by `room.type`.

**State transitions**:
- Created → Active (has ≥2 members for group, exactly 2 for direct)
- Active → 1-member (group only, when members leave — conversation persists)
- Active/1-member → Deleted (explicit delete, or last member leaves for group)

### ConversationMembership (unchanged)

| Field | Type | Notes |
|-------|------|-------|
| conversationId | UUID | Composite PK part 1 |
| actorID | UUID | Composite PK part 2, indexed |
| conversation | Conversation | ManyToOne back-reference |
| createdAt | DateTime | Auto-set |

No changes needed. Already supports N members per conversation.

### Messaging (unchanged)

Platform singleton container. No structural changes.

### Room (modified — enum only)

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| type | RoomType | **EXTENDED** | Add `CONVERSATION_GROUP` value. Existing `CONVERSATION_DIRECT` unchanged. |

The room type is the **single source of truth** for conversation kind:
- `CONVERSATION_DIRECT` → Matrix DM room, exactly 2 members, unique per pair
- `CONVERSATION_GROUP` → Matrix group room, 2+ members, not deduplicated

## Enum Changes

### CommunicationConversationType — REMOVED

This enum is **deleted entirely**. It was always redundant:
- USER_USER vs USER_VC → derivable from member actor types (already done in every code path)
- DIRECT vs GROUP → derivable from `room.type`

All code referencing this enum (`inferConversationType`, `type` field resolver, query filtering) is refactored to use `room.type` and member actor types directly.

### ConversationEventType (modified)

| Value | Status | Description |
|-------|--------|-------------|
| `CONVERSATION_CREATED` | existing | |
| `MESSAGE_RECEIVED` | existing | |
| `MESSAGE_REMOVED` | existing | |
| `READ_RECEIPT_UPDATED` | existing | |
| `MEMBER_ADDED` | **NEW** | Member added to group conversation |
| `MEMBER_REMOVED` | **NEW** | Member removed from / left group conversation |
| `CONVERSATION_DELETED` | **NEW** | Conversation deleted — all members notified |

### RoomType (modified)

| Value | Status | Description |
|-------|--------|-------------|
| `CONVERSATION_DIRECT` | existing | DM room (2 fixed members) |
| `CONVERSATION_GROUP` | **NEW** | Group room (2+ members, mutable membership) |

## Relationships Diagram

```
Platform ──1:1──▶ Messaging ──1:N──▶ Conversation ──1:1──▶ Room (type = DIRECT | GROUP)
                                         │
                                         │ 1:N
                                         ▼
                                   ConversationMembership
                                         │
                                         │ N:1
                                         ▼
                                       Actor
                                    (User | VC | Org)
```

## Validation Rules

| Rule | Applies to | Enforcement |
|------|-----------|-------------|
| GROUP conversations (room.type = CONVERSATION_GROUP) require ≥2 members at creation | createConversation | Service validation |
| DIRECT conversations (room.type = CONVERSATION_DIRECT) require exactly 2 members | createConversation | Service validation |
| DIRECT conversations are unique per member pair | createConversation | Existing dedup logic |
| GROUP conversations are not deduplicated | createConversation | No dedup check |
| Member IDs are deduplicated silently at creation | createConversation | Service logic |
| Add/remove member mutations are group-only (reject if room.type = CONVERSATION_DIRECT) | addMember/removeMember | Service validation |
| Self-removal (leave) is group-only | removeMember (via leaveConversation resolver) | Service validation |
| Auto-delete when 0 members remain | removeMember | Service trigger |
| 1-member groups are valid (preserved for history access) | removeMember | No auto-delete at 1 |

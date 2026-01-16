# Matrix Admin Rights Reflection

This document tracks requirements and findings for implementing proper reflection of Alkemio authorization privileges to Matrix room power levels.

## Problem Statement

Alkemio has its own authorization system where users can be granted DELETE privileges on Rooms (and other entities). However, these privileges are not currently reflected in the underlying Matrix server's power level system.

Matrix uses "power levels" to determine what actions users can perform:
- **Power level 0**: Default user (can send messages)
- **Power level 50**: Moderator (can kick users, redact messages)
- **Power level 100**: Admin (full control)

When an Alkemio admin tries to delete another user's message:
1. Alkemio correctly authorizes the action via its own permission system
2. The Matrix API call fails because the admin doesn't have moderator power level in Matrix
3. Current workaround: Impersonate the message sender to delete the message

## Current Workarounds

### 1. Message Deletion (`removeRoomMessage`)

See `src/domain/communication/room/room.service.ts:removeRoomMessage()`

The workaround:
1. Looks up the original message sender's actorId
2. Deletes the message AS the sender (impersonation)

### 2. Reaction Removal (`removeReactionToMessage`)

See `src/domain/communication/room/room.service.ts:removeReactionToMessage()`

The workaround:
1. Looks up the original reaction sender's actorId
2. Removes the reaction AS the sender (impersonation)

**Note:** Matrix reaction removal semantics may differ from message deletion - needs testing to confirm whether moderators can even remove others' reactions via standard APIs.

**Issues with these approaches:**
- Audit trail shows sender performed the action, not the admin
- Doesn't scale to other moderation actions (banning, kicking, etc.)
- Potential security concerns with impersonation pattern

## Requirements for Proper Implementation

### 1. Power Level Synchronization

When Alkemio grants a user DELETE privilege on a Room, we need to:
- Update the user's power level in the corresponding Matrix room to moderator (50) or higher
- Handle this for all room types where message deletion is permitted

### 2. Events/Triggers to Handle

Power level updates should occur when:
- [ ] User is granted role with DELETE privilege on a room
- [ ] User is removed from role with DELETE privilege
- [ ] Room is created (set initial power levels)
- [ ] Space/subspace admin status changes
- [ ] Global platform admin status changes

### 3. Affected Operations

Operations that require Matrix moderator rights:
- [x] Delete/redact messages (`removeRoomMessage`) - **WORKAROUND APPLIED**
- [x] Remove reactions (`removeReactionToMessage`) - **WORKAROUND APPLIED**
- [ ] Kick users from rooms (future)
- [ ] Ban users from rooms (future)

## Findings

<!-- Add findings here as we investigate -->

### Finding 1: [Date - Author]

_Add findings about Matrix power level API, current adapter capabilities, etc._

---

### Finding 2: [Date - Author]

_Add findings about authorization events that could trigger power level updates_

---

## Implementation Considerations

### Option A: Lazy Synchronization
Update Matrix power levels at the time of the moderation action.

**Pros:**
- Simpler to implement initially
- No need to track authorization changes

**Cons:**
- Additional latency on moderation actions
- May still fail if Matrix state is inconsistent

### Option B: Eager Synchronization
Update Matrix power levels whenever Alkemio authorization changes.

**Pros:**
- Moderation actions work immediately
- Cleaner separation of concerns

**Cons:**
- Need to hook into authorization change events
- More complex to implement
- Need to handle edge cases (offline Matrix server, etc.)

### Option C: Hybrid Approach
Eager sync for known admin roles, lazy sync as fallback.

---

## Related Files

- `src/domain/communication/room/room.service.ts` - Room operations with workaround
- `src/domain/communication/room/room.resolver.mutations.ts` - GraphQL mutations
- `src/services/adapters/communication-adapter/` - Matrix adapter
- `src/core/authorization/` - Authorization system

## References

- [Matrix Power Levels Spec](https://spec.matrix.org/latest/client-server-api/#mroompower_levels)
- [Synapse Admin API](https://matrix-org.github.io/synapse/latest/admin_api/)

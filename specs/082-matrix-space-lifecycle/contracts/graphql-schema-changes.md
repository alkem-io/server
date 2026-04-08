# GraphQL Schema Changes: Matrix Space Lifecycle Management

**Branch**: `082-matrix-space-lifecycle` | **Date**: 2026-03-25

## New Mutation

### `adminCommunicationSyncSpaceHierarchy`

Admin-only mutation to synchronize all Alkemio spaces into the Matrix space hierarchy. Idempotent — safe to call multiple times.

```graphql
extend type Mutation {
  """
  Synchronize all Alkemio spaces into the Matrix space hierarchy.
  Creates missing Matrix spaces, anchors rooms, and establishes
  forum hierarchy. Idempotent - safe to call multiple times.
  Requires platform admin privileges.
  """
  adminCommunicationSyncSpaceHierarchy: Boolean!
}
```

**Authorization**: Platform Admin only
**Naming Convention**: Follows existing `adminCommunication*` mutation pattern
**Behavior**:
- Iterates all spaces ordered by level (L0 → L1 → L2)
- For each space: creates Matrix space if missing, anchors to parent
- For each space's rooms: anchors to owning Matrix space
- For each forum: creates forum/category Matrix spaces, anchors discussion rooms with public visibility
- Returns `true` on success

## No Breaking Changes

This feature adds:
- 1 new mutation (additive, non-breaking)
- No field removals or type changes
- No changes to existing queries or mutations

## Adapter Method Extensions (Internal, Not GraphQL)

These are internal `CommunicationAdapter` method signature changes, not GraphQL schema changes:

```typescript
// New parameters added (lib already supports these fields)
createSpace(contextId, name, parentContextId?, avatarUrl?, joinRule?): Promise<boolean>
updateSpace(contextId, name?, topic?, avatarUrl?, joinRule?): Promise<boolean>
createRoom(roomId, type, name?, members?, parentContextId?, avatarUrl?, joinRule?): Promise<boolean>

// Breaking migration: isPublic removed, replaced by joinRule
updateRoom(roomId, name?, topic?, joinRule?, avatarUrl?): Promise<boolean>  // was: isPublic?
```

No `@alkemio/matrix-adapter-lib` changes needed — lib `0.0.0-develop` @ 4fc8544 already uses `join_rule: JoinRule` exclusively (`is_public` removed). Constants: `JoinRulePublic`, `JoinRuleInvite`, `JoinRuleRestricted`.

## Synapse Infrastructure Changes (Non-GraphQL)

These changes are to the Synapse homeserver configuration and module, not the GraphQL API:

### AlkemioRoomControl Module Extension
- **File**: `.build/synapse/modules/alkemio_room_control.py`
- **Change**: Added `_patch_sync_handler()` — monkey-patches `SyncHandler.get_sync_result_builder` to filter rooms with `io.alkemio.visibility` state event `{"visible": false}` from `/sync` for non-bot users
- **Custom state event**: `io.alkemio.visibility` with content `{"visible": false}` hides rooms from Element clients

### Synapse Homeserver Configuration
- **File**: `.build/synapse/homeserver.yaml`
- **Changes**: Enabled `registration_shared_secret`; added `room_list_publication_rules` (bot-only publication)

### Development Stack
- **Files**: `.env.docker`, `quickstart-services.yml`, `.build/synapse/alkemio.matrix.host.log.config`
- **Changes**: Env var rename (`SYNAPSE_SERVER_SHARED_SECRET`), adapter image → `latest`, module debug logging

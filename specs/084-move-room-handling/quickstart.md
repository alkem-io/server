# Quickstart: Room Handling During Cross-Space Moves

**Branch**: `084-move-room-handling`

## Prerequisites

- `pnpm install` completed
- Services running: `pnpm run start:services` (PostgreSQL, RabbitMQ, Redis, Kratos)
- Database migrated: `pnpm run migration:run`

## Development

### Key files to implement

1. **New module**: `src/domain/communication/space-move-rooms/`
   - `space.move.rooms.module.ts` — NestJS module, imports CommunicationModule
   - `space.move.rooms.service.ts` — Main orchestration logic
   - `space.move.rooms.service.spec.ts` — Unit tests

2. **Integration point**: The 083 move service will call `handleRoomsDuringMove()`.
   Until 083 is implemented, test the service in isolation via unit tests.

### Running tests

```bash
# Run only this feature's tests
pnpm test -- src/domain/communication/space-move-rooms/

# Run all communication tests
pnpm test -- src/domain/communication/

# Full CI suite
pnpm test:ci:no:coverage
```

### Manual testing (requires 083 move service)

1. Start server: `pnpm start:dev`
2. Create an L0 space with an L1 subspace
3. Add callouts with comments to the L1 subspace
4. Add community members
5. Execute the move via 083's mutation
6. Verify:
   - Comments still visible in callouts (check via GraphQL query)
   - Former members cannot post new messages
   - Updates room is empty

### Debugging Matrix operations

```bash
# Start with Matrix adapter debugging
pnpm run start:services:ai:debug

# Watch RabbitMQ management console for AMQP RPC traffic
# Default: http://localhost:15672 (guest/guest)
```

### Key patterns to follow

- **Fire-and-forget**: Use `.catch()` pattern from `CommunityCommunicationService`
- **Logging**: Use `LogContext.COMMUNICATION` for all log entries
- **Room creation**: Room entity must be saved to DB BEFORE calling adapter `createRoom()`
- **Batch operations**: One adapter call per actor (batch rooms), not one call per room

### Dependencies (existing, no changes needed)

| Service | Purpose |
|---------|---------|
| `SpaceLookupService` | `getAllDescendantSpaceIDs(spaceId)` |
| `CommunicationAdapter` | AMQP RPC to Matrix adapter |
| `RoomService` | Room entity CRUD |
| `CommunicationService` | Communication entity access |

# Quickstart: Room Handling During Cross-Space Moves

**Branch**: `084-move-room-handling`

## Prerequisites

- `pnpm install` completed
- Services running: `pnpm run start:services` (PostgreSQL, RabbitMQ, Redis, Kratos)
- Database migrated: `pnpm run migration:run`

## Module Location

```
src/domain/communication/space-move-rooms/
├── space.move.rooms.module.ts        # NestJS module
├── space.move.rooms.service.ts       # Domain service
└── space.move.rooms.service.spec.ts  # Unit tests (16 cases)
```

## Running Tests

```bash
# Run only this feature's tests
pnpm test -- src/domain/communication/space-move-rooms/

# Run all communication domain tests
pnpm test -- src/domain/communication/

# Full CI suite (without coverage for speed)
pnpm test:ci:no:coverage
```

## Integration with 083 Move Service

The service is designed to be called by the 083 cross-space-moves feature. Until 083 is implemented, test in isolation via unit tests.

### Wiring into the move orchestrator

```typescript
// In the 083 ConversionService (or equivalent move service):
import { SpaceMoveRoomsService } from '@domain/communication/space-move-rooms/space.move.rooms.service';

// After community memberships are cleared:
const removedActorIds = [...userActorIds, ...orgActorIds, ...vcActorIds];
// Fire-and-forget — do not await
void this.spaceMoveRoomsService.handleRoomsDuringMove(
  movedSpaceId,
  removedActorIds
);
```

### Module import

```typescript
// In the module that hosts the move service:
import { SpaceMoveRoomsModule } from '@domain/communication/space-move-rooms/space.move.rooms.module';

@Module({
  imports: [
    SpaceMoveRoomsModule,
    // ... other imports
  ],
})
export class ConversionModule {}
```

## Manual Testing (requires 083 move mutation)

1. Start server: `pnpm start:dev`
2. Create an L0 space with an L1 subspace
3. Add callouts with comments (10+ comments from different users)
4. Add community members to the L1
5. Execute the cross-L0 move via 083's mutation
6. Verify:
   - **Comments preserved**: Query callout discussions — all pre-move comments visible with correct author attribution
   - **Memberships revoked**: Former members get authorization errors when posting
   - **Updates room empty**: No old announcements visible in the updates room
   - **New members work**: Add a user to the moved space's community, verify they can read pre-move comments and post new ones

## Debugging

### RabbitMQ Management Console

Monitor AMQP RPC traffic for adapter calls:
```
http://localhost:15672 (guest/guest)
```

Look for messages on the Matrix adapter queue with `'cross-L0-move'` as the reason field.

### Structured Logs

All log entries use `LogContext.COMMUNICATION`. Key messages:
- `Room handling during move completed` — success summary with counts
- `Failed to revoke room memberships for actor` — per-actor revocation failure
- `Failed to revoke space memberships for actor` — per-actor space revocation failure
- `Failed to recreate updates room` — per-space recreation failure
- `Failed to handle rooms during space move` — top-level orchestration failure

### Matrix Adapter Debug Mode

```bash
pnpm run start:services:ai:debug
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Fire-and-forget adapter calls | Move transaction must not depend on Matrix availability (FR-008) |
| O(actors) call pattern | One `batchRemoveMember` per actor, not per room (NFR-002) |
| Updates room recreated, not preserved | Announcements are context-specific; clean slate for new community (US3) |
| No new migration | Feature operates on existing entities; no schema changes needed |
| Standard re-population flow | New members access preserved rooms via existing community join path (FR-013) |

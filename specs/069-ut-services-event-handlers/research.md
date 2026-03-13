# Research: Unit Tests for `src/services/event-handlers`

## Area Structure

The `src/services/event-handlers/internal/message-inbox/` directory contains:

### Service Files (testable)
- **message.inbox.service.ts** (462 lines) - Main event handler orchestrator with `@OnEvent` decorators for Matrix events. Handles message received/edited/redacted, reactions, room lifecycle, and read receipts. Delegates to MessageNotificationService and VcInvocationService.
- **message.notification.service.ts** (239 lines) - Processes notifications and activity events for messages. Handles mentions, replies, and room-type-specific notifications (POST, CALENDAR_EVENT, DISCUSSION_FORUM, UPDATES, CALLOUT).
- **vc.invocation.service.ts** (234 lines) - Manages Virtual Contributor invocations. Handles direct conversations, existing threads, and new threads with VC mentions.

### Event DTOs (excluded from testing)
- message.received.event.ts, message.edited.event.ts, message.redacted.event.ts
- reaction.added.event.ts, reaction.removed.event.ts
- room.created.event.ts, room.dm.requested.event.ts
- room.member.left.event.ts, room.member.updated.event.ts, room.receipt.updated.event.ts

### Module (excluded from testing)
- message.inbox.module.ts

## Existing Test Coverage

3 spec files already exist with 28 passing tests:
- message.inbox.service.spec.ts (12 tests)
- message.notification.service.spec.ts (8 tests)
- vc.invocation.service.spec.ts (8 tests)

## Testing Patterns Used

- NestJS `Test.createTestingModule` with `useMocker(defaultMockerFactory)`
- `MockWinstonProvider` for logger injection
- Vitest `Mocked<T>` type for mock typing
- Factory functions (`makeRoom`, `makePayload`) for test data
- Direct method calls on service instances (not event-driven)

## Key Dependencies Mocked

- RoomLookupService, RoomServiceEvents, RoomMentionsService
- SubscriptionPublishService, ConversationService
- ActorContextService, CommunicationAdapter
- InAppNotificationService, VirtualContributorMessageService
- RoomResolverService, EntityManager

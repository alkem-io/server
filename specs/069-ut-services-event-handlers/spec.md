# Specification: Unit Tests for `src/services/event-handlers`

## Objective

Achieve >= 80% test coverage for the `src/services/event-handlers` area by adding missing unit tests to the three service files: `MessageInboxService`, `MessageNotificationService`, and `VcInvocationService`.

## Scope

### In Scope

- Unit tests for `MessageInboxService` (message.inbox.service.ts)
- Unit tests for `MessageNotificationService` (message.notification.service.ts)
- Unit tests for `VcInvocationService` (vc.invocation.service.ts)
- All event handler methods decorated with `@OnEvent`
- All private helper methods exercised through public API
- Edge cases: missing data, error paths, room type branching

### Out of Scope

- Event DTOs (trivial constructors, excluded by convention)
- Module file (message.inbox.module.ts)
- Integration or E2E tests
- Modifying source code

## Baseline Coverage

| File | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| message.inbox.service.ts | 75.6% | 80% | 62.5% | 75.6% |
| message.notification.service.ts | 76.92% | 80% | 75% | 76.92% |
| vc.invocation.service.ts | 97.67% | 90% | 100% | 97.61% |
| **All files** | **79.31%** | **81.66%** | **67.44%** | **79.19%** |

## Coverage Gaps Identified

### MessageInboxService
1. `handleReactionAdded` - not tested
2. `handleReactionRemoved` - not tested
3. `handleRoomCreated` - not tested
4. `handleRoomDmRequested` - not tested
5. `handleRoomMemberLeft` - not tested
6. `handleRoomMemberUpdated` - not tested
7. `publishMessageRemovedConversationEvent` when conversation not found (warn path)

### MessageNotificationService
1. `processRoomTypeNotificationsAndActivities` for `RoomType.CALENDAR_EVENT`
2. `processRoomTypeNotificationsAndActivities` for `RoomType.DISCUSSION_FORUM`
3. `getMentionsFromText` delegation method
4. `processVirtualContributorMentions` delegation method

### VcInvocationService
1. Error logging path when a VC invocation fails in `processDirectConversation`

## Target Coverage

>= 80% statements, branches, functions, and lines across all files.

# Plan: Unit Tests for `src/services/event-handlers`

## Approach

Extend the three existing `.spec.ts` files with additional test cases to cover uncovered branches and methods. No new test files are needed.

## Implementation Steps

### Phase 1: MessageInboxService (message.inbox.service.spec.ts)

1. Add `describe('handleReactionAdded')` with test for publishing reaction CREATE event
2. Add `describe('handleReactionRemoved')` with test for publishing reaction DELETE event
3. Add `describe('handleRoomCreated')` with test confirming logging-only behavior
4. Add `describe('handleRoomDmRequested')` with test confirming logging-only behavior
5. Add `describe('handleRoomMemberLeft')` with test confirming logging-only behavior
6. Add `describe('handleRoomMemberUpdated')` with test confirming logging-only behavior
7. Add test for `handleMessageRedacted` when conversation not found (warn + skip)

### Phase 2: MessageNotificationService (message.notification.service.spec.ts)

1. Add test for CALENDAR_EVENT room type
2. Add test for DISCUSSION_FORUM room type
3. Add test for `getMentionsFromText` delegation
4. Add test for `processVirtualContributorMentions` delegation

### Phase 3: VcInvocationService (vc.invocation.service.spec.ts)

1. Add test for `processDirectConversation` when a VC invocation rejects (error logging)

## Verification

Run `npx vitest run --coverage --coverage.include='src/services/event-handlers/**/*.ts' src/services/event-handlers` and confirm >= 80% across all metrics.

# Data Model: Unit Tests for `src/services/event-handlers`

## No Data Model Changes

This task is test-only. No database schema, entity, or migration changes are required.

## Key Interfaces Used in Tests

### IRoom
- `id: string`
- `type: RoomType` (CALLOUT, POST, CONVERSATION, CONVERSATION_DIRECT, UPDATES, CALENDAR_EVENT, DISCUSSION_FORUM)
- `messagesCount: number`
- `vcInteractionsByThread: Record<string, VcInteractionData>`

### IMessage
- `id: string`
- `message: string`
- `sender: string`
- `threadID?: string`
- `timestamp: number`
- `reactions: IReaction[]`

### MessagePayload (VcInvocationService)
- `roomId: string`
- `actorID: string`
- `message: { id, message, threadID?, timestamp }`

### VcInteractionData
- `virtualContributorActorID: string`
- `externalThreadId?: string`

### Event Payloads
Each event class wraps a typed payload object. See individual event files for exact shapes.

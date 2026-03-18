# Spec: Unit Tests for src/services/util

## Overview

The `src/services/util/` directory contains a single testable utility function: `ack` in `ack.ts`. This function acknowledges RabbitMQ messages via the NestJS microservices `RmqContext`.

## Testable Surface

| File | Status | Testable |
|------|--------|----------|
| `ack.ts` | Active (8 lines) | Yes |
| `index.ts` | Barrel export | No (excluded by convention) |

## Function Under Test

```typescript
export const ack = (context: RmqContext) => {
  const channel: Channel = context.getChannelRef();
  const originalMsg = context.getMessage() as Message;
  channel.ack(originalMsg);
};
```

### Behavior

1. Extracts the RabbitMQ `Channel` from the `RmqContext` via `getChannelRef()`.
2. Extracts the original `Message` from the context via `getMessage()`.
3. Calls `channel.ack(originalMsg)` to acknowledge the message.

## Test Scenarios

1. **Happy path**: Verify `channel.ack` is called with the correct message object.
2. **Delegation verification**: Ensure `getChannelRef` and `getMessage` are called exactly once.

## Coverage Target

>=80% statement coverage of `ack.ts`.

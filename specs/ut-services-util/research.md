# Research: src/services/util

## File Inventory

| File | Size | Description |
|------|------|-------------|
| `ack.ts` | 8 lines | RabbitMQ message acknowledgment utility |
| `index.ts` | 1 line | Barrel export for `ack` |

## Dependencies

- `@nestjs/microservices` -- provides `RmqContext`
- `amqplib` -- provides `Channel` and `Message` types

## Usage Pattern

The `ack` function is used in RabbitMQ message handlers to acknowledge received messages after processing. It extracts the channel and message from the NestJS `RmqContext` and delegates to amqplib's native `channel.ack()`.

## Testing Approach

Since `ack` is a pure function (no class, no DI), it can be tested with simple mocks without the NestJS testing module. The `RmqContext` and `Channel` can be mocked using Vitest's `vi.fn()`.

# Research: src/services/subscriptions

## File Inventory

| File | Type | Testable | Existing Tests |
|------|------|----------|----------------|
| subscription.publish.service.ts | Service | Yes | Full (8 tests, 100%) |
| subscription.read.service.ts | Service | Yes | Skipped (0%) |
| typed.pub.sub.engine.ts | Type definition | No | N/A |
| subscription.service.module.ts | Module | No (excluded) | N/A |
| dto/*.ts (6 files) | Interfaces/types | No | N/A |
| index.ts (2 files) | Barrel exports | No | N/A |

## Architecture

Both services depend on 6 PubSubEngine tokens injected via NestJS DI:
- `SUBSCRIPTION_ACTIVITY_CREATED`
- `SUBSCRIPTION_ROOM_EVENT`
- `SUBSCRIPTION_VIRTUAL_UPDATED`
- `SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED`
- `SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER`
- `SUBSCRIPTION_CONVERSATION_EVENT`

`SubscriptionPublishService` publishes events with payloads.
`SubscriptionReadService` creates async iterators for GraphQL subscriptions.

## Test Infrastructure

- `pubSubEngineMockFactory` in `@test/utils` creates mock providers for PubSubEngine tokens
- `MockWinstonProvider` and `MockCacheManager` are standard test helpers
- `defaultMockerFactory` handles unmocked dependencies

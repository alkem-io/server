# Data Model: src/services/subscriptions

## No Data Model Changes

This is a test-only task. No entities, migrations, or schema changes are involved.

## Key Types Referenced

- `TypedPubSubEngine<T>` - extends `PubSubEngine` with typed `publish` and `asyncIterableIterator`
- `SubscriptionType` - enum with subscription type constants (ACTIVITY_CREATED, ROOM_EVENTS, etc.)
- Various payload interfaces in `dto/` - pure TypeScript interfaces, no runtime behavior

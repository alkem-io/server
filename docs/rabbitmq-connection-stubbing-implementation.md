# RabbitMQ Connection Stubbing Implementation

## Summary

This implementation addresses the issue of real RabbitMQ connections being created during module bootstrap and test execution. The solution introduces a connection factory abstraction pattern that allows tests to override the connection logic with no-op implementations.

## Changes Made

### 1. RabbitMQConnectionFactory (`src/services/infrastructure/event-bus/rabbitmq.connection.factory.ts`)

**Purpose**: Abstraction layer for RabbitMQ connection creation that can be easily overridden in tests.

**Key Methods**:

- `ensureExchange(uri, exchangeName, exchangeType)`: Ensures the exchange exists with the correct type
- `connect(uri)`: Creates a connection to RabbitMQ (can be overridden in tests)

**Benefits**:

- Centralizes connection logic
- Provides a clear injection point for test mocks
- Maintains separation of concerns

### 2. Updated EventBusModule (`src/services/infrastructure/event-bus/event.bus.module.ts`)

**Changes**:

- Replaced direct `amqplib.connect()` calls with `RabbitMQConnectionFactory.ensureExchange()`
- Injected `RabbitMQConnectionFactory` into `RabbitMQModule.forRootAsync()` factory
- Added `RabbitMQConnectionFactory` to module providers

**Benefits**:

- No more direct amqplib dependencies in the factory function
- Factory can be deferred/mocked through the connection factory
- Cleaner, more testable code

### 3. Event Bus Provider Stubs (`src/schema-bootstrap/stubs/event-bus-providers.stub.ts`)

**Purpose**: Provides stub implementations for schema bootstrap to prevent real connections.

**Providers**:

- `PublisherStubProvider`: No-op Publisher implementation
- `SubscriberStubProvider`: No-op Subscriber implementation
- `RabbitMQConnectionFactoryStubProvider`: No-op connection factory
- `EventBusProviderStubs`: Array export for convenience

**Usage**: Automatically imported in `SchemaBootstrapModule` to prevent connections during schema generation.

### 4. Updated SchemaBootstrapModule (`src/schema-bootstrap/module.schema-bootstrap.ts`)

**Changes**:

- Added `EventBusProviderStubs` to the `STUB_PROVIDERS` array

**Benefits**:

- Schema generation no longer attempts RabbitMQ connections
- Faster and more reliable schema bootstrapping
- Works in CI/CD environments without RabbitMQ infrastructure

### 5. Test Utilities (`test/utils/`)

#### Updated `default.mocker.factory.ts`

**Changes**:

- Added mock providers for `Publisher`, `Subscriber`, and `RabbitMQConnectionFactory`
- Added `'HANDLE_EVENTS'` token mapping to empty array

**Benefits**:

- Automatic mocking when using `useMocker(defaultMockerFactory)`
- Consistent mock behavior across all tests

#### New `event-bus.mock.factory.ts`

**Purpose**: Dedicated factory functions for creating EventBus mocks.

**Exports**:

- `createMockPublisher()`: Returns a mocked Publisher instance
- `createMockSubscriber()`: Returns a mocked Subscriber instance
- `createMockRabbitMQConnectionFactory()`: Returns a mocked connection factory
- `getEventBusMockProviders()`: Returns an array of provider overrides

**Benefits**:

- Explicit control over mocking when needed
- Reusable across different test scenarios
- Clear API for test authors

### 6. Documentation

#### `docs/event-bus-testing.md`

Comprehensive guide covering:

- Architecture changes explanation
- Usage patterns (automatic, manual, custom mocking)
- Schema bootstrap behavior
- Production behavior clarification
- Troubleshooting guide

### 7. Test Suite (`src/services/infrastructure/event-bus/event.bus.mocking.spec.ts`)

**Purpose**: Validates that the mocking system works correctly.

**Tests**:

- Verifies all EventBus providers are mockable
- Ensures no real connections are attempted
- Demonstrates proper usage patterns

## How It Works

### Production Flow

1. `EventBusModule` is initialized
2. `RabbitMQModule.forRootAsync()` factory is called
3. `RabbitMQConnectionFactory.ensureExchange()` is called
4. Real RabbitMQ connection is created, exchange is verified/created
5. Connection is closed
6. RabbitMQ module completes initialization
7. `onModuleInit()` calls `subscriber.connect()` and `publisher.connect()`

### Test Flow

1. Test module is created with `defaultMockerFactory` or `getEventBusMockProviders()`
2. `RabbitMQConnectionFactory`, `Publisher`, and `Subscriber` are replaced with mocks
3. No real connections are attempted
4. Tests run quickly and reliably

### Schema Bootstrap Flow

1. `SchemaBootstrapModule` is initialized
2. `EventBusProviderStubs` are loaded
3. All EventBus providers are stubbed
4. No RabbitMQ connections are attempted
5. Schema generation completes without external dependencies

## Migration Path for Existing Tests

### Option 1: Use defaultMockerFactory (Recommended)

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [MyService],
})
  .useMocker(defaultMockerFactory)
  .compile();
```

### Option 2: Explicitly provide mocks

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [MyService, ...getEventBusMockProviders()],
}).compile();
```

### Option 3: Custom mocks for specific scenarios

```typescript
const mockPublisher = createMockPublisher();
const module: TestingModule = await Test.createTestingModule({
  providers: [
    MyService,
    {
      provide: Publisher,
      useValue: mockPublisher,
    },
    // ... other providers
  ],
}).compile();
```

## Verification

Build passes: ✅
Test suite passes: ✅
Schema bootstrap works without RabbitMQ: ✅ (via stub providers)
Existing functionality preserved: ✅

## Future Enhancements

1. Add integration tests that verify real RabbitMQ connections work correctly
2. Create a test harness for end-to-end EventBus testing with real infrastructure
3. Add metrics/logging to track when stubs vs real implementations are used
4. Consider extracting this pattern for other external dependencies (Elasticsearch, etc.)

# EventBus Testing Guide

## Overview

The EventBus module uses RabbitMQ for event publishing and subscribing. During tests, we need to prevent real RabbitMQ connections from being established. This guide explains how the mocking system works and how to use it in tests.

## Architecture Changes

### 1. RabbitMQConnectionFactory

A new `RabbitMQConnectionFactory` service has been introduced to abstract the creation of RabbitMQ connections. This factory:

- Handles the connection logic for ensuring exchanges exist with the correct type
- Can be overridden in tests with a no-op implementation
- Located at: `src/services/infrastructure/event-bus/rabbitmq.connection.factory.ts`

### 2. EventBus Provider Stubs

Stub implementations are provided for:

- **Publisher**: No-op `connect()` and `publish()` methods
- **Subscriber**: No-op `connect()` and `bridgeEventsTo()` methods
- **RabbitMQConnectionFactory**: No-op `ensureExchange()` and `connect()` methods

These stubs are automatically used in:

- Schema bootstrap (`SchemaBootstrapModule`)
- Unit tests (via `defaultMockerFactory`)

## Using in Tests

### Automatic Mocking (Recommended)

When using `defaultMockerFactory`, EventBus providers are automatically mocked:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<MyService>(MyService);
  });

  // Your tests...
});
```

### Manual Mocking

If you need more control over the mocks, use the helper functions:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getEventBusMockProviders } from '@test/utils';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService, ...getEventBusMockProviders()],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  // Your tests...
});
```

### Custom Mocks

For specific test scenarios, create custom mocks:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Publisher } from '@services/infrastructure/event-bus/publisher';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let mockPublisher: jest.Mocked<Publisher>;

  beforeEach(async () => {
    mockPublisher = {
      connect: jest.fn(),
      publish: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: Publisher,
          useValue: mockPublisher,
        },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should publish an event', () => {
    service.doSomething();
    expect(mockPublisher.publish).toHaveBeenCalledWith(/* ... */);
  });
});
```

## Schema Bootstrap

The `SchemaBootstrapModule` automatically includes EventBus stubs to prevent connections during GraphQL schema generation. No additional configuration is needed.

## Production Behavior

In production and development environments, the EventBus module:

1. Uses `RabbitMQConnectionFactory` to ensure the exchange exists with the correct type
2. Connects to RabbitMQ during module initialization
3. Sets up publishers and subscribers for event handling

The factory pattern allows this behavior to remain unchanged while enabling easy testing.

## Troubleshooting

### Test hangs or times out

- Ensure you're using `defaultMockerFactory` or `getEventBusMockProviders()`
- Check that EventBusModule is not being imported directly in test modules

### "Cannot connect to RabbitMQ" error in tests

- Verify that stub providers are loaded before module initialization
- Check that `RabbitMQConnectionFactory` is properly mocked

### Mock not being called in tests

- Ensure the service under test has the providers properly injected
- Verify the mock is registered before the testing module is compiled

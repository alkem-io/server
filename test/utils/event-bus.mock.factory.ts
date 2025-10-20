/**
 * Test utilities for mocking EventBus-related providers in unit tests.
 * These mocks prevent real RabbitMQ connections during test execution.
 */

import { Publisher } from '@services/infrastructure/event-bus/publisher';
import { Subscriber } from '@services/infrastructure/event-bus/subscriber';
import { RabbitMQConnectionFactory } from '@services/infrastructure/event-bus/rabbitmq.connection.factory';

/**
 * Creates a mock Publisher for use in tests.
 */
export const createMockPublisher = () => ({
  connect: jest.fn(),
  publish: jest.fn(),
});

/**
 * Creates a mock Subscriber for use in tests.
 */
export const createMockSubscriber = () => ({
  connect: jest.fn(),
  bridgeEventsTo: jest.fn(),
});

/**
 * Creates a mock RabbitMQConnectionFactory for use in tests.
 */
export const createMockRabbitMQConnectionFactory = () => ({
  ensureExchange: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      on: jest.fn(),
      assertExchange: jest.fn().mockResolvedValue(undefined),
      deleteExchange: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
});

/**
 * Returns an array of provider overrides for EventBus-related services.
 * Use with Test.createTestingModule().overrideProvider() or in the providers array.
 */
export const getEventBusMockProviders = () => [
  {
    provide: Publisher,
    useValue: createMockPublisher(),
  },
  {
    provide: Subscriber,
    useValue: createMockSubscriber(),
  },
  {
    provide: RabbitMQConnectionFactory,
    useValue: createMockRabbitMQConnectionFactory(),
  },
];

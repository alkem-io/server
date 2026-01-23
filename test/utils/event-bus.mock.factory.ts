/**
 * Test utilities for mocking EventBus-related providers in unit tests.
 * These mocks prevent real RabbitMQ connections during test execution.
 */

import { vi } from 'vitest';
import { Publisher } from '@services/infrastructure/event-bus/publisher';
import { Subscriber } from '@services/infrastructure/event-bus/subscriber';
import { RabbitMQConnectionFactory } from '@services/infrastructure/event-bus/rabbitmq.connection.factory';

/**
 * Creates a mock Publisher for use in tests.
 */
export const createMockPublisher = () => ({
  connect: vi.fn(),
  publish: vi.fn(),
});

/**
 * Creates a mock Subscriber for use in tests.
 */
export const createMockSubscriber = () => ({
  connect: vi.fn(),
  bridgeEventsTo: vi.fn(),
});

/**
 * Creates a mock RabbitMQConnectionFactory for use in tests.
 */
export const createMockRabbitMQConnectionFactory = () => ({
  ensureExchange: vi.fn().mockResolvedValue(undefined),
  connect: vi.fn().mockResolvedValue({
    createChannel: vi.fn().mockResolvedValue({
      on: vi.fn(),
      assertExchange: vi.fn().mockResolvedValue(undefined),
      deleteExchange: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }),
    close: vi.fn().mockResolvedValue(undefined),
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

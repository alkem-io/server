/**
 * Stub implementations for EventBus providers (Publisher, Subscriber, RabbitMQConnectionFactory)
 * to prevent real RabbitMQ connections during schema bootstrap and tests.
 */

import { Provider } from '@nestjs/common';
import { Publisher } from '@services/infrastructure/event-bus/publisher';
import { Subscriber } from '@services/infrastructure/event-bus/subscriber';
import { RabbitMQConnectionFactory } from '@services/infrastructure/event-bus/rabbitmq.connection.factory';

/**
 * Stub Publisher that doesn't connect to RabbitMQ.
 */
export const PublisherStubProvider: Provider = {
  provide: Publisher,
  useValue: {
    connect: () => undefined,
    publish: () => undefined,
  },
};

/**
 * Stub Subscriber that doesn't connect to RabbitMQ.
 */
export const SubscriberStubProvider: Provider = {
  provide: Subscriber,
  useValue: {
    connect: () => undefined,
    bridgeEventsTo: () => undefined,
  },
};

/**
 * Stub RabbitMQConnectionFactory that doesn't create real connections.
 */
export const RabbitMQConnectionFactoryStubProvider: Provider = {
  provide: RabbitMQConnectionFactory,
  useValue: {
    ensureExchange: async () => undefined,
    connect: async () => ({
      createChannel: async () => ({
        on: () => undefined,
        assertExchange: async () => undefined,
        deleteExchange: async () => undefined,
        close: async () => undefined,
      }),
      close: async () => undefined,
    }),
  },
};

export const EventBusProviderStubs = [
  PublisherStubProvider,
  SubscriberStubProvider,
  RabbitMQConnectionFactoryStubProvider,
];

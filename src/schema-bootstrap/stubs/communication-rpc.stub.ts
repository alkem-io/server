/**
 * Stub module for CommunicationRpcModule used during schema generation.
 *
 * Replaces the real RabbitMQ connection with a no-op stub to allow
 * GraphQL schema generation without requiring infrastructure dependencies.
 */

import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Global, Module, Provider } from '@nestjs/common';

/**
 * Creates a stub AmqpConnection that mimics the real AmqpConnection interface
 * but performs no actual network operations.
 *
 * Uses `unknown` casts to satisfy TypeScript since we only need the interface
 * shape for DI resolution during schema generation, not actual functionality.
 */
const createStubAmqpConnection = (): unknown => ({
  init: async () => undefined,
  connect: async () => undefined,
  createSubscriber: async () => ({ consumerTag: 'stub' }),
  createRpc: async () => ({ consumerTag: 'stub' }),
  createChannel: async () => ({
    addSetup: async () => undefined,
    removeSetup: async () => undefined,
    ack: () => undefined,
    nack: () => undefined,
    sendToQueue: () => true,
    publish: () => true,
    on: () => undefined,
    close: async () => undefined,
  }),
  channel: {
    addSetup: async () => undefined,
  },
  managedConnection: {
    on: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    close: async () => undefined,
  },
  managedChannel: {
    addSetup: async () => undefined,
  },
  setDefaultRpcTimeout: () => undefined,
  request: async <T>(): Promise<T> => undefined as unknown as T,
  publish: async () => true,
  sendToQueue: async () => true,
  initChannel: async () => undefined,
});

/**
 * Provider for the stub AmqpConnection used by CommunicationAdapter.
 * This replaces the connection created by RabbitMQModule.forRootAsync().
 */
export const CommunicationRpcStubProvider: Provider = {
  provide: AmqpConnection,
  useFactory: () => createStubAmqpConnection() as AmqpConnection,
};

/**
 * Stub module that replaces CommunicationRpcModule during schema generation.
 *
 * This module provides a mock AmqpConnection without actually creating
 * a RabbitMQ connection, allowing schema generation to complete without
 * requiring RabbitMQ infrastructure.
 */
@Global()
@Module({
  providers: [CommunicationRpcStubProvider],
  exports: [CommunicationRpcStubProvider],
})
export class CommunicationRpcStubModule {}

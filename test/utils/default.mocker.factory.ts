import { createMock } from '@golevelup/ts-vitest';
import { InjectionToken } from '@nestjs/common';
import { Publisher } from '@services/infrastructure/event-bus/publisher';
import { RabbitMQConnectionFactory } from '@services/infrastructure/event-bus/rabbitmq.connection.factory';
import { Subscriber } from '@services/infrastructure/event-bus/subscriber';
import { MockWinstonProvider } from '@test/mocks';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';

const mockerDictionary = new Map<InjectionToken, unknown>([
  [WINSTON_MODULE_NEST_PROVIDER, MockWinstonProvider],
  ['HANDLE_EVENTS', []],
  [
    Publisher,
    {
      connect: vi.fn(),
      publish: vi.fn(),
    },
  ],
  [
    Subscriber,
    {
      connect: vi.fn(),
      bridgeEventsTo: vi.fn(),
    },
  ],
  [
    RabbitMQConnectionFactory,
    {
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
    },
  ],
]);

export const defaultMockerFactory = (token: InjectionToken | undefined) => {
  // For class-based tokens, use @golevelup/ts-vitest's createMock
  // This replaces the ModuleMocker from jest-mock
  if (typeof token === 'function') {
    return createMock(token);
  }

  // For string tokens, check the dictionary first
  if (typeof token === 'string') {
    // Handle repository tokens
    if (token.endsWith('EntityRepository')) {
      return repositoryMockFactory();
    }

    // Check for known mock providers
    const mockProvider = mockerDictionary.get(token);
    if (mockProvider) {
      return mockProvider;
    }
  }

  // Symbol or other token types - check dictionary
  if (token !== undefined) {
    const mockProvider = mockerDictionary.get(token);
    if (mockProvider) {
      return mockProvider;
    }
  }

  throw Error(
    `[Default Mocker] No provider found for token: ${JSON.stringify(token)}`
  );
};

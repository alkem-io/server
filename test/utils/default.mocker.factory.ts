import { InjectionToken } from '@nestjs/common';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MockWinstonProvider } from '@test/mocks';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { Publisher } from '@services/infrastructure/event-bus/publisher';
import { Subscriber } from '@services/infrastructure/event-bus/subscriber';
import { RabbitMQConnectionFactory } from '@services/infrastructure/event-bus/rabbitmq.connection.factory';

const moduleMocker = new ModuleMocker(global);

const mockerDictionary = new Map<InjectionToken, any>([
  [WINSTON_MODULE_NEST_PROVIDER, MockWinstonProvider],
  ['HANDLE_EVENTS', []],
  [
    Publisher,
    {
      connect: jest.fn(),
      publish: jest.fn(),
    },
  ],
  [
    Subscriber,
    {
      connect: jest.fn(),
      bridgeEventsTo: jest.fn(),
    },
  ],
  [
    RabbitMQConnectionFactory,
    {
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
    },
  ],
]);

export const defaultMockerFactory = (token: InjectionToken | undefined) => {
  if (typeof token === 'function') {
    const mockMetadata = moduleMocker.getMetadata(
      token
    ) as MockFunctionMetadata<any, any>;
    const Mock = moduleMocker.generateFromMetadata(mockMetadata);
    return new Mock();
  }

  if (typeof token === 'string') {
    if (token.endsWith('EntityRepository')) {
      return repositoryMockFactory();
    }

    const mockProvider = mockerDictionary.get(token);

    if (mockProvider) {
      return mockProvider;
    }
  }

  throw Error(
    `[Default Mocker] No provider found for token: ${JSON.stringify(token)}`
  );
};

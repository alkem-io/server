import { InjectionToken } from '@nestjs/common';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MockWinstonProvider } from '@test/mocks';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';

const moduleMocker = new ModuleMocker(global);

const mockerDictionary = new Map<InjectionToken, any>([
  [WINSTON_MODULE_NEST_PROVIDER, MockWinstonProvider],
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

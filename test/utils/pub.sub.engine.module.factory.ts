import { InjectionToken } from '@nestjs/common';

export const pubSubEngineModuleMockFactory = (token: InjectionToken) => {
  return {
    provide: token,
    useValue: {
      asyncIterator: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  };
};

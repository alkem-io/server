import { InjectionToken } from '@nestjs/common';

export const pubSubEngineMockFactory = (token: InjectionToken) => {
  return {
    provide: token,
    useValue: {
      asyncIterableIterator: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  };
};

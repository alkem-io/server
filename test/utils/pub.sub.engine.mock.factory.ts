import { InjectionToken } from '@nestjs/common';
import { vi } from 'vitest';

export const pubSubEngineMockFactory = (token: InjectionToken) => {
  return {
    provide: token,
    useValue: {
      asyncIterableIterator: vi.fn(),
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
  };
};

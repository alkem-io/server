import { CACHE_MANAGER, ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { Cache } from 'cache-manager';

export const MockCacheManager: ValueProvider<PublicPart<Cache>> = {
  provide: CACHE_MANAGER,
  useValue: {
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    reset: jest.fn(),
    store: jest.fn(),
    wrap: jest.fn(),
  },
};

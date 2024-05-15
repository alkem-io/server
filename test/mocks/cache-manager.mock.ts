import { ValueProvider } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PublicPart } from '../utils/public-part';

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

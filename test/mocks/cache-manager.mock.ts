import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ValueProvider } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockCacheManager: ValueProvider<PublicPart<Cache>> = {
  provide: CACHE_MANAGER,
  useValue: {
    del: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    reset: vi.fn(),
    store: vi.fn(),
    wrap: vi.fn(),
  },
};

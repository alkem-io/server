import { vi } from 'vitest';
import { ValueProvider } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
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

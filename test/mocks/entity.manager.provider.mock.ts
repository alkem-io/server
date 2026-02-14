import { vi } from 'vitest';
import { ValueProvider } from '@nestjs/common';

export const MockEntityManagerProvider: ValueProvider = {
  provide: 'EntityManager',
  useValue: {
    find: vi.fn(),
  },
};

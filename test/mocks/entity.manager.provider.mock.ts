import { ValueProvider } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockEntityManagerProvider: ValueProvider<
  PublicPart<EntityManager>
> = {
  provide: EntityManager,
  useValue: {
    find: vi.fn(),
  },
};

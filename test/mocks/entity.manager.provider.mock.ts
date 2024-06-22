import { EntityManager } from 'typeorm';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockEntityManagerProvider: ValueProvider<
  PublicPart<EntityManager>
> = {
  provide: EntityManager,
  useValue: {
    find: jest.fn(),
  },
};

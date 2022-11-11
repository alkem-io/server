import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { Repository } from 'typeorm';
import { MockType } from './mock.type';

export const repositoryMockFactory: () => MockType<
  Repository<BaseAlkemioEntity>
> = jest.fn(() => ({
  findOne: jest.fn(entity => entity),
  find: jest.fn(entity => entity),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
}));

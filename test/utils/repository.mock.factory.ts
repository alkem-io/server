import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { Repository } from 'typeorm';
import { MockType } from './mock.type';

export const repositoryMockFactory: () => MockType<
  Repository<BaseAlkemioEntity>
> = jest.fn(() => {
  const methods = Object.getOwnPropertyNames(Repository.prototype).filter(
    method => method !== 'constructor'
  );

  const mock: any = {};
  methods.forEach(method => {
    mock[method] = jest.fn();
  });

  return mock;
});

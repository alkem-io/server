import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { MockType } from './mock.type';

export const repositoryMockFactory: () => MockType<
  Repository<BaseAlkemioEntity>
> = vi.fn(() => {
  const methods = Object.getOwnPropertyNames(Repository.prototype).filter(
    method => method !== 'constructor'
  );

  const mock: any = {};
  methods.forEach(method => {
    mock[method] = vi.fn();
  });

  return mock;
});

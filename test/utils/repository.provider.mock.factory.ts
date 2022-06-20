import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { repositoryMockFactory } from './repository.mock.factory';

export const repositoryProviderMockFactory = (entity: EntityClassOrSchema) => {
  return {
    provide: getRepositoryToken(entity),
    useFactory: repositoryMockFactory,
  };
};

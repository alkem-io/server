import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { CACHE_MANAGER } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { User } from '.';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';

const moduleMocker = new ModuleMocker(global);

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useFactory: repositoryMockFactory,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            token
          ) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    service = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

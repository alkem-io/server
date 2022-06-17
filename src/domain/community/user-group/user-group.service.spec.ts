import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupService } from './user-group.service';
import { UserGroup } from '.';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';

const moduleMocker = new ModuleMocker(global);
describe('UserGroupService', () => {
  let service: UserGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupService,
        {
          provide: getRepositoryToken(UserGroup),
          useFactory: repositoryMockFactory,
        },
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

    service = module.get<UserGroupService>(UserGroupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

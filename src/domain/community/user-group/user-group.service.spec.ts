import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupService } from './user-group.service';
import { UserGroup } from '.';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('UserGroupService', () => {
  let service: UserGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupService,
        repositoryProviderMockFactory(UserGroup),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<UserGroupService>(UserGroupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

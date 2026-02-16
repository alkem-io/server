import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { UserGroupService } from './user-group.service';

describe('UserGroupService', () => {
  let service: UserGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupService,
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

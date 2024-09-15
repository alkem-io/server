import { Test, TestingModule } from '@nestjs/testing';
import { RoleManager } from './role.manager.entity';
import { RoleManagerService } from './role.manager.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('RoleManagerService', () => {
  let service: RoleManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleManagerService,
        repositoryProviderMockFactory(RoleManager),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<RoleManagerService>(RoleManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

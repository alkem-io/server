import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { RoleSet } from './role.set.entity';
import { RoleSetService } from './role.set.service';

describe('RoleSetService', () => {
  let service: RoleSetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetService,
        repositoryProviderMockFactory(RoleSet),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<RoleSetService>(RoleSetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

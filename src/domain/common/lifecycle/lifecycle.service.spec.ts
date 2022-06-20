import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleService } from './lifecycle.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Lifecycle } from './lifecycle.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('LifecycleService', () => {
  let service: LifecycleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleService,
        repositoryProviderMockFactory(Lifecycle),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

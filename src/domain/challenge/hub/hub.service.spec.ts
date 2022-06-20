import { Test, TestingModule } from '@nestjs/testing';
import { HubService } from './hub.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Hub } from './hub.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('HubService', () => {
  let service: HubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HubService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Hub),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<HubService>(HubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

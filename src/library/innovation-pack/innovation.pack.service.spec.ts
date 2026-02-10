import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { InnovationPack } from './innovation.pack.entity';
import { InnovationPackService } from './innovation.pack.service';

describe('InnovationPackService', () => {
  let service: InnovationPackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPackService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(InnovationPack),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InnovationPackService>(InnovationPackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

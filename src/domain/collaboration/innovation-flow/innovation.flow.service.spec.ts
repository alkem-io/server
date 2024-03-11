import { Test, TestingModule } from '@nestjs/testing';
import { InnovationFlowService } from './innovaton.flow.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { InnovationFlow } from './innovation.flow.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('InnovationFlowService', () => {
  let service: InnovationFlowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationFlowService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(InnovationFlow),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InnovationFlowService>(InnovationFlowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

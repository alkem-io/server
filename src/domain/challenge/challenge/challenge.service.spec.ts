import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeService } from './challenge.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Challenge } from './challenge.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('ChallengeService', () => {
  let service: ChallengeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Challenge),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<ChallengeService>(ChallengeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeService } from './challenge.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Challenge } from './challenge.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('ChallengeService', () => {
  let service: ChallengeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeService,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getRepositoryToken(Challenge),
          useFactory: repositoryMockFactory,
        },
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

import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationService } from './communication.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Communication } from './communication.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';

describe('CommunicationService', () => {
  let service: CommunicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationService,
        {
          provide: getRepositoryToken(Communication),
          useFactory: repositoryMockFactory,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CommunicationService>(CommunicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

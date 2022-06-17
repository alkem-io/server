import { Hub } from '@domain/challenge/hub/hub.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { BootstrapService } from './bootstrap.service';

describe('BootstrapService', () => {
  let service: BootstrapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BootstrapService,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getRepositoryToken(Hub),
          useFactory: repositoryMockFactory,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(BootstrapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

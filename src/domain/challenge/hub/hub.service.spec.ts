import { Test, TestingModule } from '@nestjs/testing';
import { HubService } from './hub.service';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Hub } from './hub.entity';

const moduleMocker = new ModuleMocker(global);

describe('HubService', () => {
  let service: HubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HubService,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getRepositoryToken(Hub),
          useFactory: repositoryMockFactory,
        },
      ],
    })
      .useMocker(token => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            token
          ) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    service = module.get<HubService>(HubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

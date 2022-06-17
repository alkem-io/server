import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { OrganizationService } from './organization.service';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Organization } from '..';

const moduleMocker = new ModuleMocker(global);

describe('OrganizationService', () => {
  let service: OrganizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: getRepositoryToken(Organization),
          useFactory: repositoryMockFactory,
        },
        MockCacheManager,
        MockWinstonProvider,
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

    service = module.get<OrganizationService>(OrganizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

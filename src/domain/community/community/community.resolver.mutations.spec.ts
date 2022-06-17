import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverMutations } from './community.resolver.mutations';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';

const moduleMocker = new ModuleMocker(global);

describe('CommunityResolver', () => {
  let resolver: CommunityResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
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

    resolver = module.get<CommunityResolverMutations>(
      CommunityResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

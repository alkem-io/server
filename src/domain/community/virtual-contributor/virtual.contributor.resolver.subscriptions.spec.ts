import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { VirtualContributorResolverSubscriptions } from './virtual.contributor.resolver.subscriptions';

describe('VirtualContributorResolverSubscriptions', () => {
  let resolver: VirtualContributorResolverSubscriptions;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorResolverSubscriptions,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<VirtualContributorResolverSubscriptions>(
      VirtualContributorResolverSubscriptions
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

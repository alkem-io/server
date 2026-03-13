import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { VirtualContributorResolverQueries } from './virtual.contributor.resolver.queries';

describe('VirtualContributorResolverQueries', () => {
  let resolver: VirtualContributorResolverQueries;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorResolverQueries,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<VirtualContributorResolverQueries>(
      VirtualContributorResolverQueries
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

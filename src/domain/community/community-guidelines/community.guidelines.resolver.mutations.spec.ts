import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CommunityGuidelinesResolverMutations } from './community.guidelines.resolver.mutations';

describe('CommunityGuidelinesResolverMutations', () => {
  let resolver: CommunityGuidelinesResolverMutations;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityGuidelinesResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<CommunityGuidelinesResolverMutations>(
      CommunityGuidelinesResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

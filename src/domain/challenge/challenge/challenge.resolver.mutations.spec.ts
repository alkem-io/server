import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { pubSubEngineMockFactory } from '@test/utils/pub.sub.engine.mock.factory';
import { SUBSCRIPTION_OPPORTUNITY_CREATED } from '@common/constants';

describe('ChallengeResolver', () => {
  let resolver: ChallengeResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        pubSubEngineMockFactory(SUBSCRIPTION_OPPORTUNITY_CREATED),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<ChallengeResolverMutations>(
      ChallengeResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

import { SUBSCRIPTION_CALLOUT_POST_CREATED } from '@common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { pubSubEngineMockFactory } from '@test/utils/pub.sub.engine.mock.factory';
import { ContextResolverMutations } from './context.resolver.mutations';

describe('ContextResolver', () => {
  let resolver: ContextResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
        pubSubEngineMockFactory(SUBSCRIPTION_CALLOUT_POST_CREATED),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ContextResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

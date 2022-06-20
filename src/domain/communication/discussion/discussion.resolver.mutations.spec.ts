import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionResolverMutations } from './discussion.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SUBSCRIPTION_DISCUSSION_MESSAGE } from '@common/constants';
import { pubSubEngineMockFactory } from '@test/utils/pub.sub.engine.mock.factory';

describe('DiscussionResolver', () => {
  let resolver: DiscussionResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
        pubSubEngineMockFactory(SUBSCRIPTION_DISCUSSION_MESSAGE),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(DiscussionResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionResolverMutations } from './discussion.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('DiscussionResolver', () => {
  let resolver: DiscussionResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
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

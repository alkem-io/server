import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationResolverMutations } from './communication.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants';
import { pubSubEngineMockFactory } from '@test/utils/pub.sub.engine.mock.factory';

describe('CommunicationResolver', () => {
  let resolver: CommunicationResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
        pubSubEngineMockFactory(SUBSCRIPTION_DISCUSSION_UPDATED),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CommunicationResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

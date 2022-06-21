import { Test, TestingModule } from '@nestjs/testing';
import { UpdatesResolverMutations } from './updates.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SUBSCRIPTION_UPDATE_MESSAGE } from '@common/constants';
import { pubSubEngineMockFactory } from '@test/utils/pub.sub.engine.mock.factory';

describe('UpdatesResolverMutations', () => {
  let resolver: UpdatesResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdatesResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
        pubSubEngineMockFactory(SUBSCRIPTION_UPDATE_MESSAGE),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(UpdatesResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

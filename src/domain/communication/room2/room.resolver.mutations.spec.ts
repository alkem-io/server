import { Test, TestingModule } from '@nestjs/testing';
import { RoomResolverMutations } from './room.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { pubSubEngineMockFactory } from '@test/utils/pub.sub.engine.mock.factory';
import { SUBSCRIPTION_ASPECT_COMMENT } from '@common/constants/providers';

describe('RoomResolverMutations', () => {
  let resolver: RoomResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
        pubSubEngineMockFactory(SUBSCRIPTION_ASPECT_COMMENT),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(RoomResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

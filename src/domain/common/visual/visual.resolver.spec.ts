import { Test, TestingModule } from '@nestjs/testing';
import { VisualResolverMutations } from './visual.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('VisualResolver', () => {
  let resolver: VisualResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisualResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<VisualResolverMutations>(VisualResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

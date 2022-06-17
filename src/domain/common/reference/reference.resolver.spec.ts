import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceResolverMutations } from './reference.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('ReferenceResolver', () => {
  let resolver: ReferenceResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ReferenceResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

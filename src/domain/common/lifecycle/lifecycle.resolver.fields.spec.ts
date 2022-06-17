import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleResolverFields } from './lifecycle.resolver.fields';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('LifecycleResolverFields', () => {
  let resolver: LifecycleResolverFields;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleResolverFields,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LifecycleResolverFields);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

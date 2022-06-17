import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleResolverFields } from './lifecycle.resolver.fields';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';

const moduleMocker = new ModuleMocker(global);

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
      .useMocker(token => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            token
          ) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    resolver = module.get(LifecycleResolverFields);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

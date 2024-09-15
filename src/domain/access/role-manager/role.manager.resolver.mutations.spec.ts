import { Test, TestingModule } from '@nestjs/testing';
import { RoleManagerResolverMutations } from './role.manager.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('RoleManagerResolver', () => {
  let resolver: RoleManagerResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleManagerResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<RoleManagerResolverMutations>(
      RoleManagerResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

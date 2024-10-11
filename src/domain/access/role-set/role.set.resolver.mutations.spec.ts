import { Test, TestingModule } from '@nestjs/testing';
import { RoleSetResolverMutations } from './role.set.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('RoleSetResolver', () => {
  let resolver: RoleSetResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<RoleSetResolverMutations>(RoleSetResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

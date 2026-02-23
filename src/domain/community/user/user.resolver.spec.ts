import { Test, TestingModule } from '@nestjs/testing';
import { MockEntityManagerProvider } from '@test/mocks';
import { MockActorLookupService } from '@test/mocks/actor.lookup.service.mock';
import { MockAuthorizationPolicyService } from '@test/mocks/authorization.policy.service.mock';
import { MockAuthorizationService } from '@test/mocks/authorization.service.mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockCommunicationAdapter } from '@test/mocks/communication.adapter.mock';
import { MockNotificationPlatformAdapter } from '@test/mocks/notification.platform.adapter.service.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { MockPlatformAuthorizationService } from '@test/mocks/platform.authorization.service.mock';
import { MockUserAuthorizationService } from '@test/mocks/user.authorization.service.mock';
import { MockUserService } from '@test/mocks/user.service.mock';
import { MockUserSettingsHomeSpaceValidationService } from '@test/mocks/user.settings.home.space.validation.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { UserResolverMutations } from './user.resolver.mutations';
import { UserResolverQueries } from './user.resolver.queries';

describe('UserResolver', () => {
  let resolver: UserResolverQueries;
  let resolverMutations: UserResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockCacheManager,
        MockWinstonProvider,
        MockUserService,
        MockActorLookupService,
        MockAuthorizationService,
        MockAuthorizationPolicyService,
        MockPlatformAuthorizationService,
        MockCommunicationAdapter,
        MockUserAuthorizationService,
        MockUserSettingsHomeSpaceValidationService,
        MockNotificationPlatformAdapter,
        MockNotificationsService,
        MockEntityManagerProvider,
        UserResolverMutations,
        UserResolverQueries,
      ],
    }).compile();

    resolver = module.get(UserResolverQueries);
    resolverMutations = module.get(UserResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
    expect(resolverMutations).toBeDefined();
  });
});

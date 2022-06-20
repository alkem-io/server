import { Test, TestingModule } from '@nestjs/testing';
import { UserResolverQueries } from './user.resolver.queries';
import { UserResolverMutations } from './user.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockUserService } from '@test/mocks/user.service.mock';
import { MockAuthorizationService } from '@test/mocks/authorization.service.mock';
import { MockAuthorizationPolicyService } from '@test/mocks/authorization.policy.service.mock';
import { MockAgentService } from '@test/mocks/agent.service.mock';
import { MockCommunicationAdapter } from '@test/mocks/communication.adapter.mock';
import { MockUserAuthorizationService } from '@test/mocks/user.authorization.service.mock';
import { MockNotificationsPayloadBuilder } from '@test/mocks/notifications.payload.builder.mock';
import { MockPreferenceService } from '@test/mocks/preference.service.mock';
import { MockPreferenceSetService } from '@test/mocks/preference.set.service.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';

describe('UserResolver', () => {
  let resolver: UserResolverQueries;
  let resolverMutations: UserResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockCacheManager,
        MockWinstonProvider,
        MockUserService,
        MockAgentService,
        MockAuthorizationService,
        MockAuthorizationPolicyService,
        MockCommunicationAdapter,
        MockUserAuthorizationService,
        MockNotificationsPayloadBuilder,
        MockPreferenceService,
        MockPreferenceSetService,
        MockNotificationsService,
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

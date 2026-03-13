import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { PlatformAdminResolverFields } from './platform.admin.resolver.fields';
import { PlatformAdminService } from './platform.admin.service';

describe('PlatformAdminResolverFields', () => {
  let resolver: PlatformAdminResolverFields;
  let authorizationService: Record<string, Mock>;
  let platformAuthorizationService: Record<string, Mock>;
  let platformAdminService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as any as ActorContext;
  const platformPolicy = { id: 'platform-auth' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformAdminResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PlatformAdminResolverFields);
    authorizationService = module.get(AuthorizationService) as any;
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    platformAdminService = module.get(PlatformAdminService) as any;

    platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
      platformPolicy
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('innovationHubs', () => {
    it('should check authorization and return all innovation hubs', async () => {
      const hubs = [{ id: 'hub-1' }];
      platformAdminService.getAllInnovationHubs.mockResolvedValue(hubs);

      const result = await resolver.innovationHubs(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin InnovationHubs'
      );
      expect(result).toEqual(hubs);
    });
  });

  describe('innovationPacks', () => {
    it('should check authorization and return all innovation packs', async () => {
      const packs = [{ id: 'pack-1' }];
      platformAdminService.getAllInnovationPacks.mockResolvedValue(packs);

      const result = await resolver.innovationPacks(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin InnovationPacks'
      );
      expect(result).toEqual(packs);
    });

    it('should pass query args to service', async () => {
      const args = { orderBy: 'name' } as any;
      platformAdminService.getAllInnovationPacks.mockResolvedValue([]);

      await resolver.innovationPacks(actorContext, args);

      expect(platformAdminService.getAllInnovationPacks).toHaveBeenCalledWith(
        args
      );
    });
  });

  describe('spaces', () => {
    it('should check authorization and return all spaces', async () => {
      const spaces = [{ id: 'space-1' }];
      const args = {} as any;
      platformAdminService.getAllSpaces.mockResolvedValue(spaces);

      const result = await resolver.spaces(actorContext, args);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin Spaces'
      );
      expect(result).toEqual(spaces);
    });
  });

  describe('users', () => {
    it('should check authorization and return paginated users', async () => {
      const paginatedUsers = { items: [], pageInfo: {} };
      const pagination = { first: 10 } as any;
      platformAdminService.getAllUsers.mockResolvedValue(paginatedUsers);

      const result = await resolver.users(actorContext, pagination);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin Users'
      );
      expect(result).toEqual(paginatedUsers);
    });

    it('should pass withTags and filter to service', async () => {
      const pagination = { first: 10 } as any;
      const filter = { email: 'test' } as any;
      platformAdminService.getAllUsers.mockResolvedValue({});

      await resolver.users(actorContext, pagination, true, filter);

      expect(platformAdminService.getAllUsers).toHaveBeenCalledWith(
        pagination,
        true,
        filter
      );
    });
  });

  describe('organizations', () => {
    it('should check authorization and return paginated organizations', async () => {
      const paginatedOrgs = { items: [], pageInfo: {} };
      const pagination = { first: 10 } as any;
      platformAdminService.getAllOrganizations.mockResolvedValue(paginatedOrgs);

      const result = await resolver.organizations(actorContext, pagination);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin Organizations'
      );
      expect(result).toEqual(paginatedOrgs);
    });
  });

  describe('virtualContributors', () => {
    it('should check authorization and return all virtual contributors', async () => {
      const vcs = [{ id: 'vc-1' }];
      const args = {} as any;
      platformAdminService.getAllVirtualContributors.mockResolvedValue(vcs);

      const result = await resolver.virtualContributors(actorContext, args);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin Virtual Contributors'
      );
      expect(result).toEqual(vcs);
    });
  });

  describe('communication', () => {
    it('should check authorization and return empty result', async () => {
      const result = await resolver.communication(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin Communication'
      );
      expect(result).toEqual({});
    });
  });

  describe('identity', () => {
    it('should check authorization and return empty result', async () => {
      const result = await resolver.identity(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin Identity'
      );
      expect(result).toEqual({});
    });
  });
});

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
    vi.restoreAllMocks();

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
    // Baseline for every case below: the actor holds NONE of the per-family
    // privileges (F6), so each field falls through to its unchanged
    // `PLATFORM_ADMIN` check. `createMock` otherwise returns a truthy proxy
    // from `isAccessGranted`, which would silently admit every caller.
    authorizationService.isAccessGranted.mockReturnValue(false);
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

  // 027-platform-role-redesign, live finding F6. Before this, every field here
  // demanded the legacy `PLATFORM_ADMIN` catch-all, which none of the thirteen
  // new roles holds — so a Platform Users Admin the client had already admitted
  // to `/admin/users` was denied the list that page is made of.
  describe('per-family admission (F6)', () => {
    const admits = (held: AuthorizationPrivilege) =>
      authorizationService.isAccessGranted.mockImplementation(
        (
          _actor: unknown,
          _policy: unknown,
          privilege: AuthorizationPrivilege
        ) => privilege === held
      );

    it('PLATFORM_USERS_ADMIN alone reaches the user list, without PLATFORM_ADMIN', async () => {
      admits(AuthorizationPrivilege.PLATFORM_USERS_ADMIN);
      platformAdminService.getAllUsers.mockResolvedValue({ items: [] });

      await resolver.users(actorContext, { first: 10 } as any);

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(platformAdminService.getAllUsers).toHaveBeenCalled();
    });

    it('PLATFORM_CONTENT_FULL_ACCESS alone reaches the space list', async () => {
      admits(AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS);
      platformAdminService.getAllSpaces.mockResolvedValue([]);

      await resolver.spaces(actorContext, {} as any);

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(platformAdminService.getAllSpaces).toHaveBeenCalled();
    });

    it('does NOT cross families — PLATFORM_USERS_ADMIN gets no space list', async () => {
      admits(AuthorizationPrivilege.PLATFORM_USERS_ADMIN);
      platformAdminService.getAllSpaces.mockResolvedValue([]);

      await resolver.spaces(actorContext, {} as any);

      // Falls through to the unchanged catch-all check, which the real
      // AuthorizationService would reject for this actor.
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin Spaces'
      );
    });

    it('and PLATFORM_CONTENT_FULL_ACCESS gets no user list', async () => {
      admits(AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS);
      platformAdminService.getAllUsers.mockResolvedValue({ items: [] });

      await resolver.users(actorContext, { first: 10 } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'platformAdmin Users'
      );
    });

    // R-F.2 (2026-09-16, research D29) — F6's other half. Platform Support's
    // owning privilege (PLATFORM_SUPPORT_ORG_RESOURCES) is anchored on the
    // account tree, so the PLATFORM policy these lists check had nothing of
    // Support's to admit: the customer-facing admin role could not FIND the
    // organizations, packs and hubs it exists to service. A dedicated
    // platform-level READ privilege admits it to exactly those three lists —
    // and to nothing else on this resolver.
    describe('PLATFORM_SUPPORT_LISTS_READ (R-F.2)', () => {
      beforeEach(() => {
        admits(AuthorizationPrivilege.PLATFORM_SUPPORT_LISTS_READ);
      });

      it('alone reaches the organization list', async () => {
        platformAdminService.getAllOrganizations.mockResolvedValue({
          items: [],
        });

        await resolver.organizations(actorContext, { first: 10 } as any);

        expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
        expect(platformAdminService.getAllOrganizations).toHaveBeenCalled();
      });

      it('alone reaches the innovation pack list', async () => {
        platformAdminService.getAllInnovationPacks.mockResolvedValue([]);

        await resolver.innovationPacks(actorContext);

        expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
        expect(platformAdminService.getAllInnovationPacks).toHaveBeenCalled();
      });

      it('alone reaches the innovation hub list', async () => {
        platformAdminService.getAllInnovationHubs.mockResolvedValue([]);

        await resolver.innovationHubs(actorContext);

        expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
        expect(platformAdminService.getAllInnovationHubs).toHaveBeenCalled();
      });

      it.each([
        [
          'spaces',
          'platformAdmin Spaces',
          () => resolver.spaces(actorContext, {} as any),
        ],
        [
          'accounts',
          'platformAdmin Accounts',
          () => resolver.accounts(actorContext),
        ],
        [
          'virtualContributors',
          'platformAdmin Virtual Contributors',
          () => resolver.virtualContributors(actorContext, {} as any),
        ],
        [
          'users',
          'platformAdmin Users',
          () => resolver.users(actorContext, { first: 10 } as any),
        ],
        [
          'identity',
          'platformAdmin Identity',
          () => resolver.identity(actorContext),
        ],
      ])('does NOT reach %s — falls through to the catch-all', async (_field, msg, call) => {
        platformAdminService.getAllSpaces.mockResolvedValue([]);
        platformAdminService.getAllAccounts.mockResolvedValue([]);
        platformAdminService.getAllVirtualContributors.mockResolvedValue([]);
        platformAdminService.getAllUsers.mockResolvedValue({ items: [] });

        await call();

        expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
          actorContext,
          platformPolicy,
          AuthorizationPrivilege.PLATFORM_ADMIN,
          msg
        );
      });
    });
  });
});

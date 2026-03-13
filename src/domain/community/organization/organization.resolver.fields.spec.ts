import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { OrganizationResolverFields } from './organization.resolver.fields';
import { OrganizationService } from './organization.service';

describe('OrganizationResolverFields', () => {
  let resolver: OrganizationResolverFields;
  let authorizationService: {
    isAccessGranted: Mock;
    grantAccessOrFail: Mock;
  };
  let organizationService: {
    getOrganizationOrFail: Mock;
    getUserGroups: Mock;
    getRoleSet: Mock;
    getAccount: Mock;
    getVerification: Mock;
    getMetrics: Mock;
  };
  let groupService: {
    getUserGroupOrFail: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(OrganizationResolverFields);
    authorizationService = module.get(AuthorizationService) as any;
    organizationService = module.get(OrganizationService) as any;
    groupService = module.get(UserGroupService) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('groups', () => {
    it('should reload organization, check authorization and return groups', async () => {
      const org = { id: 'org-1', authorization: { id: 'auth-1' } };
      const groups = [{ id: 'group-1' }];
      const actorContext = { actorID: 'user-1' } as any;

      organizationService.getOrganizationOrFail.mockResolvedValue(org);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      organizationService.getUserGroups.mockResolvedValue(groups);

      const result = await resolver.groups(
        { id: 'org-1' } as any,
        actorContext
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        org.authorization,
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
      expect(result).toBe(groups);
    });
  });

  describe('roleSet', () => {
    it('should delegate to organizationService.getRoleSet', async () => {
      const mockRoleSet = { id: 'rs-1' };
      const org = { id: 'org-1' } as any;
      organizationService.getRoleSet.mockResolvedValue(mockRoleSet);

      const result = await resolver.roleSet(org);
      expect(result).toBe(mockRoleSet);
    });
  });

  describe('group', () => {
    it('should reload org, check auth and return group', async () => {
      const org = { id: 'org-1', authorization: { id: 'auth-1' } };
      const group = {
        id: 'group-1',
        profile: { displayName: 'Test Group' },
      };
      const actorContext = { actorID: 'user-1' } as any;

      organizationService.getOrganizationOrFail.mockResolvedValue(org);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      groupService.getUserGroupOrFail.mockResolvedValue(group);

      const result = await resolver.group(
        actorContext,
        { id: 'org-1' } as any,
        'group-1'
      );

      expect(result).toBe(group);
    });

    it('should provide default displayName when group profile has no displayName', async () => {
      const org = { id: 'org-1', authorization: { id: 'auth-1' } };
      const group = {
        id: 'group-1',
        profile: { displayName: '' },
      };
      const actorContext = { actorID: 'user-1' } as any;

      organizationService.getOrganizationOrFail.mockResolvedValue(org);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      groupService.getUserGroupOrFail.mockResolvedValue(group);

      const result = await resolver.group(
        actorContext,
        { id: 'org-1' } as any,
        'group-1'
      );

      expect(result.profile!.displayName).toContain(
        'This user group has no displayName'
      );
    });
  });

  describe('settings', () => {
    it('should return organization settings directly', () => {
      const org = {
        id: 'org-1',
        settings: {
          membership: { allowUsersMatchingDomainToJoin: false },
          privacy: { contributionRolesPubliclyVisible: true },
        },
      } as any;

      const result = resolver.settings(org);
      expect(result).toBe(org.settings);
    });
  });

  describe('account', () => {
    it('should return account when UPDATE access is granted', async () => {
      const mockAccount = { id: 'account-1' };
      const org = {
        id: 'org-1',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;

      authorizationService.isAccessGranted.mockReturnValue(true);
      organizationService.getAccount.mockResolvedValue(mockAccount);

      const result = await resolver.account(org, actorContext);
      expect(result).toBe(mockAccount);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        org.authorization,
        AuthorizationPrivilege.UPDATE
      );
    });

    it('should return undefined when UPDATE access is denied', async () => {
      const org = {
        id: 'org-1',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;

      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await resolver.account(org, actorContext);
      expect(result).toBeUndefined();
    });
  });

  describe('authorization', () => {
    it('should reload organization and return its authorization', async () => {
      const mockAuth = { id: 'auth-1' };
      const org = { id: 'org-1', authorization: mockAuth };
      organizationService.getOrganizationOrFail.mockResolvedValue(org);

      const result = await resolver.authorization({ id: 'org-1' } as any);
      expect(result).toBe(mockAuth);
    });
  });

  describe('verification', () => {
    it('should delegate to organizationService.getVerification', async () => {
      const mockVerification = { id: 'ver-1', status: 'verified' };
      const org = { id: 'org-1' } as any;

      organizationService.getVerification.mockResolvedValue(mockVerification);

      const result = await resolver.verification(org);
      expect(result).toBe(mockVerification);
    });
  });

  describe('metrics', () => {
    it('should delegate to organizationService.getMetrics', async () => {
      const mockMetrics = [{ name: 'associates', value: '5' }];
      const org = { id: 'org-1' } as any;

      organizationService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await resolver.metrics(org);
      expect(result).toBe(mockMetrics);
    });
  });
});

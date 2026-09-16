import { AuthorizationPrivilege } from '@common/enums';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { OrganizationAssociateEligibilityReason } from '@common/enums/organization.associate.eligibility.reason';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
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
  let roleSetService: {
    getMembershipStatusByActorContext: Mock;
  };
  let userLookupService: {
    getUserByIdOrFail: Mock;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    roleSetService = module.get(RoleSetService) as any;
    userLookupService = module.get(UserLookupService) as any;
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

  describe('myAssociateEligibility (FR-016, precedence order)', () => {
    const org = { id: 'org-1' } as any;
    const eligibleOrganization = {
      id: 'org-1',
      domain: 'example.com',
      settings: {
        membership: {
          allowApplications: true,
          allowUsersMatchingDomainToJoin: true,
        },
      },
      verification: { status: 'verified-manual-attestation' },
      roleSet: { id: 'rs-1', authorization: { id: 'auth-1' } },
    };

    it('returns NOT_AUTHENTICATED for an anonymous actor, without any lookup', async () => {
      const result = await resolver.myAssociateEligibility(org, {
        actorID: '',
        isAnonymous: true,
      } as any);

      expect(result).toEqual({
        canApply: false,
        canJoinDirectly: false,
        reason: OrganizationAssociateEligibilityReason.NOT_AUTHENTICATED,
      });
      expect(organizationService.getOrganizationOrFail).not.toHaveBeenCalled();
    });

    it('returns ALREADY_ASSOCIATE when the viewer is already a member', async () => {
      organizationService.getOrganizationOrFail.mockResolvedValue(
        eligibleOrganization
      );
      roleSetService.getMembershipStatusByActorContext.mockResolvedValue(
        CommunityMembershipStatus.MEMBER
      );

      const result = await resolver.myAssociateEligibility(org, {
        actorID: 'user-1',
      } as any);

      expect(result.reason).toBe(
        OrganizationAssociateEligibilityReason.ALREADY_ASSOCIATE
      );
      expect(result.canApply).toBe(false);
      expect(result.canJoinDirectly).toBe(false);
    });

    it('returns INVITATION_PENDING before ever checking the domain door', async () => {
      organizationService.getOrganizationOrFail.mockResolvedValue(
        eligibleOrganization
      );
      roleSetService.getMembershipStatusByActorContext.mockResolvedValue(
        CommunityMembershipStatus.INVITATION_PENDING
      );

      const result = await resolver.myAssociateEligibility(org, {
        actorID: 'user-1',
      } as any);

      expect(result.reason).toBe(
        OrganizationAssociateEligibilityReason.INVITATION_PENDING
      );
      expect(userLookupService.getUserByIdOrFail).not.toHaveBeenCalled();
    });

    it('returns APPLICATION_PENDING', async () => {
      organizationService.getOrganizationOrFail.mockResolvedValue(
        eligibleOrganization
      );
      roleSetService.getMembershipStatusByActorContext.mockResolvedValue(
        CommunityMembershipStatus.APPLICATION_PENDING
      );

      const result = await resolver.myAssociateEligibility(org, {
        actorID: 'user-1',
      } as any);

      expect(result.reason).toBe(
        OrganizationAssociateEligibilityReason.APPLICATION_PENDING
      );
    });

    it('returns ELIGIBLE_TO_JOIN (canJoinDirectly true, canApply still computed) when the domain door is open', async () => {
      organizationService.getOrganizationOrFail.mockResolvedValue(
        eligibleOrganization
      );
      roleSetService.getMembershipStatusByActorContext.mockResolvedValue(
        CommunityMembershipStatus.NOT_MEMBER
      );
      userLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'w@example.com',
      });
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await resolver.myAssociateEligibility(org, {
        actorID: 'user-1',
      } as any);

      expect(result).toEqual({
        canApply: true,
        canJoinDirectly: true,
        reason: OrganizationAssociateEligibilityReason.ELIGIBLE_TO_JOIN,
      });
    });

    it('returns APPLICATIONS_NOT_ACCEPTED when the domain does not match and the switch is off', async () => {
      organizationService.getOrganizationOrFail.mockResolvedValue({
        ...eligibleOrganization,
        settings: { membership: { allowApplications: false } },
      });
      roleSetService.getMembershipStatusByActorContext.mockResolvedValue(
        CommunityMembershipStatus.NOT_MEMBER
      );
      userLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'w@other.org',
      });

      const result = await resolver.myAssociateEligibility(org, {
        actorID: 'user-1',
      } as any);

      expect(result).toEqual({
        canApply: false,
        canJoinDirectly: false,
        reason:
          OrganizationAssociateEligibilityReason.APPLICATIONS_NOT_ACCEPTED,
      });
    });

    it('returns APPLY_NOT_GRANTED when applications are accepted but the stored APPLY rule has not been bound yet (pre-reset-loop organization, R4)', async () => {
      organizationService.getOrganizationOrFail.mockResolvedValue(
        eligibleOrganization
      );
      roleSetService.getMembershipStatusByActorContext.mockResolvedValue(
        CommunityMembershipStatus.NOT_MEMBER
      );
      userLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'w@other.org',
      });
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await resolver.myAssociateEligibility(org, {
        actorID: 'user-1',
      } as any);

      expect(result).toEqual({
        canApply: false,
        canJoinDirectly: false,
        reason: OrganizationAssociateEligibilityReason.APPLY_NOT_GRANTED,
      });
    });

    it('returns ELIGIBLE_TO_APPLY when every gate is open', async () => {
      organizationService.getOrganizationOrFail.mockResolvedValue(
        eligibleOrganization
      );
      roleSetService.getMembershipStatusByActorContext.mockResolvedValue(
        CommunityMembershipStatus.NOT_MEMBER
      );
      userLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'w@other.org',
      });
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await resolver.myAssociateEligibility(org, {
        actorID: 'user-1',
      } as any);

      expect(result).toEqual({
        canApply: true,
        canJoinDirectly: false,
        reason: OrganizationAssociateEligibilityReason.ELIGIBLE_TO_APPLY,
      });
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        expect.objectContaining({ actorID: 'user-1' }),
        eligibleOrganization.roleSet.authorization,
        AuthorizationPrivilege.ROLESET_ENTRY_ROLE_APPLY
      );
    });
  });
});

import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { RoleSetType } from '@common/enums/role.set.type';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationAuthorizationService } from '@domain/communication/communication/communication.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { CommunityService } from './community.service';
import { CommunityAuthorizationService } from './community.service.authorization';

describe('CommunityAuthorizationService', () => {
  let service: CommunityAuthorizationService;
  let communityService: { getCommunityOrFail: Mock };
  let authorizationPolicyService: {
    inheritParentAuthorization: Mock;
    createCredentialRuleUsingTypesOnly: Mock;
    createCredentialRule: Mock;
    appendCredentialAuthorizationRules: Mock;
  };
  let communicationAuthorizationService: {
    applyAuthorizationPolicy: Mock;
  };
  let userGroupAuthorizationService: { applyAuthorizationPolicy: Mock };
  let roleSetAuthorizationService: { applyAuthorizationPolicy: Mock };
  let roleSetService: {
    getCredentialsForRoleWithParents: Mock;
    getCredentialForRole: Mock;
    getDirectParentCredentialForRole: Mock;
  };
  let platformRolesAccessService: {
    getCredentialsForRolesWithAccess: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CommunityAuthorizationService);
    communityService = module.get(CommunityService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    communicationAuthorizationService = module.get(
      CommunicationAuthorizationService
    ) as any;
    userGroupAuthorizationService = module.get(
      UserGroupAuthorizationService
    ) as any;
    roleSetAuthorizationService = module.get(
      RoleSetAuthorizationService
    ) as any;
    roleSetService = module.get(RoleSetService) as any;
    platformRolesAccessService = module.get(PlatformRolesAccessService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw RelationshipNotFoundException when communication is missing', async () => {
      const community = {
        id: 'comm-1',
        communication: null,
        roleSet: { id: 'rs-1', type: RoleSetType.SPACE },
        groups: [],
        authorization: { credentialRules: [] },
      };
      communityService.getCommunityOrFail.mockResolvedValue(community);

      await expect(
        service.applyAuthorizationPolicy(
          'comm-1',
          {} as any,
          { roles: [] } as any,
          true,
          {
            privacy: { mode: 'public' },
            membership: {
              policy: CommunityMembershipPolicy.APPLICATIONS,
              trustedOrganizations: [],
              allowSubspaceAdminsToInviteMembers: false,
            },
          } as any,
          false
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when roleSet is missing', async () => {
      const community = {
        id: 'comm-1',
        communication: { updates: { id: 'upd-1' } },
        roleSet: null,
        groups: [],
        authorization: { credentialRules: [] },
      };
      communityService.getCommunityOrFail.mockResolvedValue(community);

      await expect(
        service.applyAuthorizationPolicy(
          'comm-1',
          {} as any,
          { roles: [] } as any,
          true,
          {
            privacy: { mode: 'public' },
            membership: {
              policy: CommunityMembershipPolicy.APPLICATIONS,
              trustedOrganizations: [],
              allowSubspaceAdminsToInviteMembers: false,
            },
          } as any,
          false
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should apply full policy for a space community', async () => {
      const authorization = { credentialRules: [] };
      const community = {
        id: 'comm-1',
        communication: { id: 'comms-1', updates: { id: 'upd-1' } },
        roleSet: { id: 'rs-1', type: RoleSetType.SPACE },
        groups: [{ id: 'group-1' }],
        authorization,
      };
      communityService.getCommunityOrFail.mockResolvedValue(community);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { cascade: false }
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      });
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        authorization
      );
      communicationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );
      userGroupAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      roleSetService.getCredentialsForRoleWithParents.mockResolvedValue([]);
      platformRolesAccessService.getCredentialsForRolesWithAccess.mockReturnValue(
        []
      );
      roleSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);

      const spaceSettings = {
        privacy: { mode: 'public' },
        membership: {
          policy: CommunityMembershipPolicy.APPLICATIONS,
          trustedOrganizations: [],
          allowSubspaceAdminsToInviteMembers: false,
        },
      };
      const result = await service.applyAuthorizationPolicy(
        'comm-1',
        {} as any,
        { roles: [] } as any,
        true,
        spaceSettings as any,
        false
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(
        communicationAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        userGroupAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(1);
      expect(
        roleSetAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
    });

    it('should throw when roleSet is not SPACE type without settings', async () => {
      const authorization = { credentialRules: [] };
      const community = {
        id: 'comm-1',
        communication: { id: 'comms-1', updates: { id: 'upd-1' } },
        roleSet: { id: 'rs-1', type: RoleSetType.ORGANIZATION },
        groups: [],
        authorization,
      };
      communityService.getCommunityOrFail.mockResolvedValue(community);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { cascade: false }
      );
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        authorization
      );
      communicationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );

      // When roleSet type is not SPACE, the createAdditionalRoleSetCredentialRules should throw
      // The spaceSettings access throws a TypeError before the RelationshipNotFoundException check
      await expect(
        service.applyAuthorizationPolicy(
          'comm-1',
          {} as any,
          { roles: [] } as any,
          true,
          undefined as any, // no settings
          false
        )
      ).rejects.toThrow();
    });

    it('should apply open membership policy when entryRoleAllowed', async () => {
      const authorization = { credentialRules: [] };
      const community = {
        id: 'comm-1',
        communication: { id: 'comms-1', updates: { id: 'upd-1' } },
        roleSet: { id: 'rs-1', type: RoleSetType.SPACE },
        groups: [],
        authorization,
      };
      communityService.getCommunityOrFail.mockResolvedValue(community);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { cascade: false }
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      });
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        authorization
      );
      communicationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );
      roleSetService.getCredentialsForRoleWithParents.mockResolvedValue([]);
      platformRolesAccessService.getCredentialsForRolesWithAccess.mockReturnValue(
        []
      );
      roleSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);

      const spaceSettings = {
        privacy: { mode: 'private' },
        membership: {
          policy: CommunityMembershipPolicy.OPEN,
          trustedOrganizations: [],
          allowSubspaceAdminsToInviteMembers: false,
        },
      };
      const result = await service.applyAuthorizationPolicy(
        'comm-1',
        {} as any,
        { roles: [] } as any,
        true,
        spaceSettings as any,
        false
      );

      expect(result).toBeDefined();
      expect(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).toHaveBeenCalled();
    });

    it('should apply subspace policy with parent member join for open membership', async () => {
      const authorization = { credentialRules: [] };
      const community = {
        id: 'comm-1',
        communication: { id: 'comms-1', updates: { id: 'upd-1' } },
        roleSet: { id: 'rs-1', type: RoleSetType.SPACE },
        groups: [],
        authorization,
      };
      communityService.getCommunityOrFail.mockResolvedValue(community);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { cascade: false }
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      });
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        authorization
      );
      communicationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );
      roleSetService.getCredentialsForRoleWithParents.mockResolvedValue([]);
      roleSetService.getDirectParentCredentialForRole.mockResolvedValue({
        type: 'space_member',
        resourceID: 'parent-space-id',
      });
      platformRolesAccessService.getCredentialsForRolesWithAccess.mockReturnValue(
        []
      );
      roleSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);

      const spaceSettings = {
        privacy: { mode: 'private' },
        membership: {
          policy: CommunityMembershipPolicy.OPEN,
          trustedOrganizations: [],
          allowSubspaceAdminsToInviteMembers: false,
        },
      };
      const result = await service.applyAuthorizationPolicy(
        'comm-1',
        {} as any,
        { roles: [] } as any,
        false, // entryRoleAllowed = false
        spaceSettings as any,
        true // isSubspace = true
      );

      expect(result).toBeDefined();
      expect(
        roleSetService.getDirectParentCredentialForRole
      ).toHaveBeenCalled();
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should apply subspace policy with parent member apply for applications membership', async () => {
      const authorization = { credentialRules: [] };
      const community = {
        id: 'comm-1',
        communication: { id: 'comms-1', updates: { id: 'upd-1' } },
        roleSet: { id: 'rs-1', type: RoleSetType.SPACE },
        groups: [],
        authorization,
      };
      communityService.getCommunityOrFail.mockResolvedValue(community);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { cascade: false }
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      });
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        authorization
      );
      communicationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );
      roleSetService.getCredentialsForRoleWithParents.mockResolvedValue([]);
      roleSetService.getDirectParentCredentialForRole.mockResolvedValue({
        type: 'space_member',
        resourceID: 'parent-space-id',
      });
      platformRolesAccessService.getCredentialsForRolesWithAccess.mockReturnValue(
        []
      );
      roleSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);

      const spaceSettings = {
        privacy: { mode: 'private' },
        membership: {
          policy: CommunityMembershipPolicy.APPLICATIONS,
          trustedOrganizations: [],
          allowSubspaceAdminsToInviteMembers: false,
        },
      };
      const result = await service.applyAuthorizationPolicy(
        'comm-1',
        {} as any,
        { roles: [] } as any,
        false,
        spaceSettings as any,
        true // isSubspace
      );

      expect(result).toBeDefined();
      expect(
        roleSetService.getDirectParentCredentialForRole
      ).toHaveBeenCalled();
    });

    it('should add trusted organization join rules', async () => {
      const authorization = { credentialRules: [] };
      const community = {
        id: 'comm-1',
        communication: { id: 'comms-1', updates: { id: 'upd-1' } },
        roleSet: { id: 'rs-1', type: RoleSetType.SPACE },
        groups: [],
        authorization,
      };
      communityService.getCommunityOrFail.mockResolvedValue(community);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { cascade: false }
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      });
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        authorization
      );
      communicationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );
      roleSetService.getCredentialsForRoleWithParents.mockResolvedValue([]);
      platformRolesAccessService.getCredentialsForRolesWithAccess.mockReturnValue(
        []
      );
      roleSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);

      const spaceSettings = {
        privacy: { mode: 'public' },
        membership: {
          policy: CommunityMembershipPolicy.APPLICATIONS,
          trustedOrganizations: ['org-1', 'org-2'],
          allowSubspaceAdminsToInviteMembers: false,
        },
      };
      await service.applyAuthorizationPolicy(
        'comm-1',
        {} as any,
        { roles: [] } as any,
        true,
        spaceSettings as any,
        false
      );

      // One call for each trusted organization + inviteMembersCriteria + applications rule
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should add allowSubspaceAdminsToInviteMembers rule when enabled', async () => {
      const authorization = { credentialRules: [] };
      const community = {
        id: 'comm-1',
        communication: { id: 'comms-1', updates: { id: 'upd-1' } },
        roleSet: { id: 'rs-1', type: RoleSetType.SPACE },
        groups: [],
        authorization,
      };
      communityService.getCommunityOrFail.mockResolvedValue(community);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { cascade: false }
      );
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      });
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        authorization
      );
      communicationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );
      roleSetService.getCredentialsForRoleWithParents.mockResolvedValue([]);
      roleSetService.getCredentialForRole.mockResolvedValue({
        type: 'space_member',
        resourceID: 'space-id',
      });
      platformRolesAccessService.getCredentialsForRolesWithAccess.mockReturnValue(
        []
      );
      roleSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);

      const spaceSettings = {
        privacy: { mode: 'private' },
        membership: {
          policy: CommunityMembershipPolicy.APPLICATIONS,
          trustedOrganizations: [],
          allowSubspaceAdminsToInviteMembers: true,
        },
      };
      await service.applyAuthorizationPolicy(
        'comm-1',
        {} as any,
        { roles: [] } as any,
        true,
        spaceSettings as any,
        false
      );

      expect(roleSetService.getCredentialForRole).toHaveBeenCalled();
    });
  });
});

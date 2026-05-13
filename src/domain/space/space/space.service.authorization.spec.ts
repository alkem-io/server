import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceSortMode } from '@common/enums/space.sort.mode';
import { SpaceVisibility } from '@common/enums/space.visibility';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SpaceAboutAuthorizationService } from '../space.about/space.about.service.authorization';
import { SpaceLookupService } from '../space.lookup/space.lookup.service';
import { SpaceAuthorizationService } from './space.service.authorization';

describe('SpaceAuthorizationService', () => {
  let service: SpaceAuthorizationService;
  let spaceLookupService: SpaceLookupService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let roleSetService: RoleSetService;
  let communityAuthorizationService: CommunityAuthorizationService;
  let collaborationAuthorizationService: CollaborationAuthorizationService;
  let storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService;
  let spaceAboutAuthorizationService: SpaceAboutAuthorizationService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let licenseAuthorizationService: LicenseAuthorizationService;
  let templatesManagerAuthorizationService: TemplatesManagerAuthorizationService;
  let platformRolesAccessService: PlatformRolesAccessService;

  const defaultSettings = {
    privacy: {
      mode: SpacePrivacyMode.PUBLIC,
      allowPlatformSupportAsAdmin: false,
    },
    membership: {
      policy: CommunityMembershipPolicy.OPEN,
      trustedOrganizations: [],
      allowSubspaceAdminsToInviteMembers: false,
    },
    collaboration: {
      inheritMembershipRights: true,
      allowMembersToCreateSubspaces: true,
      allowMembersToCreateCallouts: true,
      allowEventsFromSubspaces: true,
      allowMembersToVideoCall: false,
      allowGuestContributions: false,
    },
    sortMode: SpaceSortMode.ALPHABETICAL,
  };

  const createMockSpace = (overrides: any = {}) => ({
    id: 'space-1',
    level: SpaceLevel.L0,
    visibility: SpaceVisibility.ACTIVE,
    settings: defaultSettings,
    authorization: {
      id: 'auth-1',
      credentialRules: [],
      privilegeRules: [],
      type: AuthorizationPolicyType.SPACE,
      parentAuthorizationPolicy: undefined,
    },
    community: {
      id: 'community-1',
      roleSet: { id: 'roleset-1' },
    },
    collaboration: { id: 'collab-1' },
    about: {
      id: 'about-1',
      profile: { id: 'profile-1' },
    },
    profile: { id: 'space-profile-1' },
    storageAggregator: { id: 'storage-1' },
    templatesManager: { id: 'templates-1' },
    subspaces: [],
    license: { id: 'license-1' },
    account: { id: 'account-1' },
    platformRolesAccess: {
      roles: [
        {
          roleName: RoleName.MEMBER,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ],
    },
    ...overrides,
  });

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceAuthorizationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceAuthorizationService);
    spaceLookupService = module.get(SpaceLookupService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    roleSetService = module.get(RoleSetService);
    communityAuthorizationService = module.get(CommunityAuthorizationService);
    collaborationAuthorizationService = module.get(
      CollaborationAuthorizationService
    );
    storageAggregatorAuthorizationService = module.get(
      StorageAggregatorAuthorizationService
    );
    spaceAboutAuthorizationService = module.get(SpaceAboutAuthorizationService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    licenseAuthorizationService = module.get(LicenseAuthorizationService);
    templatesManagerAuthorizationService = module.get(
      TemplatesManagerAuthorizationService
    );
    platformRolesAccessService = module.get(PlatformRolesAccessService);

    (
      profileAuthorizationService.applyAuthorizationPolicy as any
    ).mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw when space is missing required relations', async () => {
      const mockSpace = createMockSpace({
        authorization: undefined,
        community: undefined,
      });
      (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(
        mockSpace as any
      );

      await expect(service.applyAuthorizationPolicy('space-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw when space has empty platform roles access', async () => {
      const mockSpace = createMockSpace({
        platformRolesAccess: { roles: [] },
      });
      (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(
        mockSpace as any
      );
      (
        platformRolesAccessService.getCredentialsForRolesWithAccess as any
      ).mockReturnValue([]);

      await expect(service.applyAuthorizationPolicy('space-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw when space.profile is missing', async () => {
      const mockSpace = createMockSpace({ profile: undefined });
      (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(
        mockSpace as any
      );

      await expect(service.applyAuthorizationPolicy('space-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should successfully apply auth policy for L0 ACTIVE public space', async () => {
      const mockSpace = createMockSpace();
      (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(
        mockSpace as any
      );
      (
        platformRolesAccessService.getCredentialsForRolesWithAccess as any
      ).mockReturnValue([
        {
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        },
      ]);
      (platformRolesAccessService.getPrivilegesForRole as any).mockReturnValue(
        []
      );
      (authorizationPolicyService.reset as any).mockReturnValue(
        mockSpace.authorization as any
      );
      (
        authorizationPolicyService.inheritParentAuthorization as any
      ).mockReturnValue(mockSpace.authorization as any);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        cascade: false,
      } as any);
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mockReturnValue({ cascade: false } as any);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.save as any).mockResolvedValue(
        mockSpace.authorization as any
      );
      (authorizationPolicyService.saveAll as any).mockResolvedValue([] as any);
      (roleSetService.getCredentialsForRole as any).mockResolvedValue([]);
      (
        roleSetService.getCredentialsForRoleWithParents as any
      ).mockResolvedValue([]);
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(undefined);
      (
        communityAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        collaborationAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (
        templatesManagerAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        spaceAboutAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy('space-1');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(authorizationPolicyService.reset).toHaveBeenCalled();
      expect(
        communityAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        collaborationAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        templatesManagerAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('space-profile-1', mockSpace.authorization);
    });

    it('should apply auth policy for ARCHIVED space without membership', async () => {
      const mockSpace = createMockSpace({
        visibility: SpaceVisibility.ARCHIVED,
      });
      (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(
        mockSpace as any
      );
      (
        platformRolesAccessService.getCredentialsForRolesWithAccess as any
      ).mockReturnValue([
        {
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        },
      ]);
      (platformRolesAccessService.getPrivilegesForRole as any).mockReturnValue(
        []
      );
      (authorizationPolicyService.reset as any).mockReturnValue(
        mockSpace.authorization as any
      );
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        cascade: false,
      } as any);
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mockReturnValue({ cascade: false } as any);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.save as any).mockResolvedValue(
        mockSpace.authorization as any
      );
      (authorizationPolicyService.saveAll as any).mockResolvedValue([] as any);
      (
        communityAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        collaborationAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (
        templatesManagerAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        spaceAboutAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy('space-1');

      expect(result).toBeDefined();
    });

    it('should apply auth policy for L1 space with parent', async () => {
      const mockSpace = createMockSpace({
        level: SpaceLevel.L1,
        account: undefined,
        templatesManager: undefined,
        authorization: {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
          type: AuthorizationPolicyType.SPACE,
          parentAuthorizationPolicy: {
            id: 'parent-auth',
            credentialRules: [],
            privilegeRules: [],
          },
        },
        parentSpace: {
          id: 'parent-space-1',
          community: {
            roleSet: { id: 'parent-roleset-1' },
          },
          parentSpace: undefined,
        },
      });
      (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(
        mockSpace as any
      );
      (
        platformRolesAccessService.getCredentialsForRolesWithAccess as any
      ).mockReturnValue([
        { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
      ]);
      (
        authorizationPolicyService.inheritParentAuthorization as any
      ).mockReturnValue(mockSpace.authorization as any);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        cascade: false,
      } as any);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.save as any).mockResolvedValue(
        mockSpace.authorization as any
      );
      (authorizationPolicyService.saveAll as any).mockResolvedValue([] as any);
      (roleSetService.getCredentialsForRole as any).mockResolvedValue([]);
      (
        roleSetService.getCredentialsForRoleWithParents as any
      ).mockResolvedValue([]);
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(undefined);
      (
        communityAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        collaborationAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (
        spaceAboutAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy('space-1');

      expect(result).toBeDefined();
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
    });

    it('should throw when L1 space is missing parent community roleSet', async () => {
      const mockSpace = createMockSpace({
        level: SpaceLevel.L1,
        authorization: {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
          type: AuthorizationPolicyType.SPACE,
          parentAuthorizationPolicy: {
            id: 'parent-auth',
            credentialRules: [],
            privilegeRules: [],
          },
        },
        parentSpace: {
          id: 'parent-space-1',
          community: undefined,
        },
      });
      (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(
        mockSpace as any
      );
      (
        platformRolesAccessService.getCredentialsForRolesWithAccess as any
      ).mockReturnValue([
        { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
      ]);
      (
        authorizationPolicyService.inheritParentAuthorization as any
      ).mockReturnValue(mockSpace.authorization as any);

      await expect(service.applyAuthorizationPolicy('space-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should apply auth for private L1 space using base authorization', async () => {
      const privateSettings = {
        ...defaultSettings,
        privacy: { ...defaultSettings.privacy, mode: SpacePrivacyMode.PRIVATE },
      };
      const mockSpace = createMockSpace({
        level: SpaceLevel.L1,
        settings: privateSettings,
        parentSpace: {
          id: 'parent-space-1',
          community: {
            roleSet: { id: 'parent-roleset-1' },
          },
        },
      });
      (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(
        mockSpace as any
      );
      (
        platformRolesAccessService.getCredentialsForRolesWithAccess as any
      ).mockReturnValue([
        { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
      ]);
      (platformRolesAccessService.getPrivilegesForRole as any).mockReturnValue(
        []
      );
      (authorizationPolicyService.reset as any).mockReturnValue(
        mockSpace.authorization as any
      );
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        cascade: false,
      } as any);
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mockReturnValue({ cascade: false } as any);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.save as any).mockResolvedValue(
        mockSpace.authorization as any
      );
      (authorizationPolicyService.saveAll as any).mockResolvedValue([] as any);
      (roleSetService.getCredentialsForRole as any).mockResolvedValue([]);
      (
        roleSetService.getCredentialsForRoleWithParents as any
      ).mockResolvedValue([]);
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(undefined);
      (
        communityAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        collaborationAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (
        spaceAboutAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy('space-1');

      expect(result).toBeDefined();
      // Private L1 spaces should use reset (base authorization) not inherit
      expect(authorizationPolicyService.reset).toHaveBeenCalled();
    });

    it('should recursively apply auth for subspaces', async () => {
      const mockSubspace = { id: 'subspace-1' };
      const mockSpace = createMockSpace({ subspaces: [mockSubspace] });

      let callCount = 0;
      (spaceLookupService.getSpaceOrFail as any).mockImplementation(
        async () => {
          callCount++;
          if (callCount === 1) return mockSpace as any;
          // Return a space without subspaces for the recursive call
          return createMockSpace({
            id: 'subspace-1',
            subspaces: [],
            level: SpaceLevel.L1,
            parentSpace: {
              id: 'space-1',
              community: { roleSet: { id: 'parent-roleset' } },
            },
          }) as any;
        }
      );
      (
        platformRolesAccessService.getCredentialsForRolesWithAccess as any
      ).mockReturnValue([
        { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
      ]);
      (platformRolesAccessService.getPrivilegesForRole as any).mockReturnValue(
        []
      );
      (authorizationPolicyService.reset as any).mockReturnValue(
        mockSpace.authorization as any
      );
      (
        authorizationPolicyService.inheritParentAuthorization as any
      ).mockReturnValue(mockSpace.authorization as any);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        cascade: false,
      } as any);
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mockReturnValue({ cascade: false } as any);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.save as any).mockResolvedValue(
        mockSpace.authorization as any
      );
      (authorizationPolicyService.saveAll as any).mockResolvedValue([] as any);
      (roleSetService.getCredentialsForRole as any).mockResolvedValue([]);
      (
        roleSetService.getCredentialsForRoleWithParents as any
      ).mockResolvedValue([]);
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(undefined);
      (
        communityAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        collaborationAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (
        templatesManagerAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        spaceAboutAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy('space-1');

      expect(result).toBeDefined();
      // saveAll should have been called for subspace authorizations
      expect(authorizationPolicyService.saveAll).toHaveBeenCalled();
    });

    it('should store provided parent authorization', async () => {
      const parentAuth = {
        id: 'parent-auth',
        credentialRules: [],
        privilegeRules: [],
      };
      const mockSpace = createMockSpace();
      (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(
        mockSpace as any
      );
      (
        platformRolesAccessService.getCredentialsForRolesWithAccess as any
      ).mockReturnValue([
        { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
      ]);
      (platformRolesAccessService.getPrivilegesForRole as any).mockReturnValue(
        []
      );
      (authorizationPolicyService.reset as any).mockReturnValue(
        mockSpace.authorization as any
      );
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        cascade: false,
      } as any);
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mockReturnValue({ cascade: false } as any);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as any
      ).mockReturnValue(mockSpace.authorization as any);
      (authorizationPolicyService.save as any).mockResolvedValue(
        mockSpace.authorization as any
      );
      (roleSetService.getCredentialsForRole as any).mockResolvedValue([]);
      (
        roleSetService.getCredentialsForRoleWithParents as any
      ).mockResolvedValue([]);
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(undefined);
      (
        communityAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        collaborationAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (
        templatesManagerAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        spaceAboutAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('space-1', parentAuth as any);

      expect(mockSpace.authorization.parentAuthorizationPolicy).toBe(
        parentAuth
      );
    });
  });

  describe('propagateAuthorizationToChildEntities', () => {
    it('should throw when missing required child entities', async () => {
      const space = createMockSpace({
        collaboration: undefined,
      });

      await expect(
        service.propagateAuthorizationToChildEntities(space as any, true, [])
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when missing about.profile on space', async () => {
      const space = createMockSpace({
        about: { id: 'about-1', profile: undefined },
      });

      await expect(
        service.propagateAuthorizationToChildEntities(space as any, true, [])
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should propagate auth to child entities for L0 space', async () => {
      const space = createMockSpace();

      (
        communityAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        collaborationAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (
        templatesManagerAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        cascade: false,
      } as any);
      (
        spaceAboutAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.propagateAuthorizationToChildEntities(
        space as any,
        true,
        []
      );

      expect(result).toBeDefined();
      expect(
        templatesManagerAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
    });

    it('should throw when L0 space is missing templatesManager', async () => {
      const space = createMockSpace({ templatesManager: undefined });

      (
        communityAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        collaborationAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);

      await expect(
        service.propagateAuthorizationToChildEntities(space as any, true, [])
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should NOT propagate to templatesManager for non-L0 spaces', async () => {
      const space = createMockSpace({
        level: SpaceLevel.L1,
        templatesManager: undefined,
      });

      (
        communityAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        collaborationAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        cascade: false,
      } as any);
      (
        spaceAboutAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.propagateAuthorizationToChildEntities(
        space as any,
        true,
        []
      );

      expect(result).toBeDefined();
      expect(
        templatesManagerAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });
  });
});

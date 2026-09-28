import { CREDENTIAL_RULE_SPACE_STORAGE_MEMBER_FILE_UPLOAD } from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
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
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
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
  let logger: { error: ReturnType<typeof vi.fn> };

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
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER) as any;

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
    });

    // 027-platform-role-redesign (T048, A14, T070f): the space-visibility
    // mutation's own re-anchor onto ACCOUNT_LICENSE_MANAGE. In Slice A the
    // mutation is still updateSpacePlatformSettings — the rename to
    // adminUpdateSpaceVisibility is Slice B (T078).
    it('grants ACCOUNT_LICENSE_MANAGE EXACTLY {global-admin, global-support, platform-license-manager} on the space policy, non-cascading', async () => {
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
      ).mockImplementation(
        (privileges: any, types: any, name: any) =>
          ({
            grantedPrivileges: privileges,
            criterias: types,
            name,
            cascade: true,
          }) as any
      );
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

      await service.applyAuthorizationPolicy('space-1');

      const rules = (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mock.results
        .map((r: any) => r.value)
        .filter((rule: any) =>
          rule.grantedPrivileges?.includes(
            AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE
          )
        );
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.PLATFORM_LICENSE_MANAGER,
      ]);
      expect(rules[0].cascade).toBe(false);
    });

    // 027-platform-role-redesign (QA server-C1-1, ruling (b′) "mover-only
    // reads"): platform-resource-admin's space READ must NOT cascade — it may
    // resolve the space it moves (A9 target resolution), never read the
    // space's content. The two spaces-reader roles (A16) keep their
    // cascading READ unchanged.
    it('QA server-C1-1: platform-resource-admin gets its OWN non-cascading space READ rule; the spaces-reader rules still cascade', async () => {
      const mockSpace = createMockSpace({
        settings: {
          ...defaultSettings,
          privacy: {
            ...defaultSettings.privacy,
            mode: SpacePrivacyMode.PRIVATE,
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
      (
        platformRolesAccessService.getPrivilegesForRole as any
      ).mockImplementation((_roles: any, roleName: RoleName) => {
        if (roleName === RoleName.PLATFORM_RESOURCE_ADMIN) {
          return [
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.READ_ABOUT,
          ];
        }
        if (
          roleName === RoleName.GLOBAL_SPACES_READER ||
          roleName === RoleName.PLATFORM_SPACES_READER
        ) {
          return [AuthorizationPrivilege.READ];
        }
        return [];
      });
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
      ).mockImplementation(
        (privileges: any, types: any, name: any) =>
          ({
            grantedPrivileges: privileges,
            criterias: types,
            name,
            cascade: true,
          }) as any
      );
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

      await service.applyAuthorizationPolicy('space-1');

      const rulesFor = (credential: AuthorizationCredential) =>
        (
          authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
        ).mock.results
          .map((r: any) => r.value)
          .filter(
            (rule: any) =>
              rule.criterias?.length === 1 && rule.criterias[0] === credential
          );

      const resourceAdminRules = rulesFor(
        AuthorizationCredential.PLATFORM_RESOURCE_ADMIN
      );
      expect(resourceAdminRules).toHaveLength(1);
      expect(resourceAdminRules[0].grantedPrivileges).toEqual([
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.READ_ABOUT,
      ]);
      expect(resourceAdminRules[0].cascade).toBe(false);

      for (const reader of [
        AuthorizationCredential.GLOBAL_SPACES_READER,
        AuthorizationCredential.PLATFORM_SPACES_READER,
      ]) {
        const readerRules = rulesFor(reader);
        expect(readerRules).toHaveLength(1);
        expect(readerRules[0].cascade).toBe(true);
      }
    });

    // 027-platform-role-redesign (QA server-C1-1, blocking fix): a PUBLIC
    // L1/L2 subspace does NOT go through resetToPrivateLevelZeroSpaceAuthorization
    // (that only runs for L0, or for a PRIVATE L1/L2) — it inherits the
    // parent's CASCADING rules only. Ruling (b') ("mover-only reads") means
    // PRA's space READ must never cascade into content, on any level. Before
    // the fix, PRA's credential rode the SAME `credentialCriteriasWithAccess`
    // list (added for READ_ABOUT) into the PUBLIC-mode cascading READ rule,
    // handing it full cascading content READ on public subspaces of a
    // private parent. The mover-only rule must still resolve the space
    // itself and its About card.
    it('QA server-C1-1 (blocking fix): PUBLIC L1 under a PRIVATE L0 excludes PLATFORM_RESOURCE_ADMIN from the cascading content READ rule, and still grants it its own non-cascading READ+READ_ABOUT', async () => {
      const mockSpace = createMockSpace({
        level: SpaceLevel.L1,
        settings: defaultSettings, // PUBLIC
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
          settings: {
            ...defaultSettings,
            privacy: {
              ...defaultSettings.privacy,
              mode: SpacePrivacyMode.PRIVATE,
            },
          },
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
      ).mockImplementation(
        (_roles: any, privileges: AuthorizationPrivilege[]) => {
          if (privileges.includes(AuthorizationPrivilege.READ_ABOUT)) {
            return [
              {
                type: AuthorizationCredential.PLATFORM_RESOURCE_ADMIN,
                resourceID: '',
              },
            ];
          }
          return [];
        }
      );
      (
        platformRolesAccessService.getPrivilegesForRole as any
      ).mockImplementation((_roles: any, roleName: RoleName) => {
        if (roleName === RoleName.PLATFORM_RESOURCE_ADMIN) {
          return [
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.READ_ABOUT,
          ];
        }
        return [];
      });
      (authorizationPolicyService.reset as any).mockReturnValue(
        mockSpace.authorization as any
      );
      (
        authorizationPolicyService.inheritParentAuthorization as any
      ).mockReturnValue(mockSpace.authorization as any);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockSpace.authorization as any);
      (
        authorizationPolicyService.createCredentialRule as any
      ).mockImplementation(
        (privileges: any, criterias: any, name: any) =>
          ({
            grantedPrivileges: privileges,
            criterias,
            name,
            cascade: false,
          }) as any
      );
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mockImplementation(
        // Mirror the real service (authorization.policy.service.ts), which
        // returns cascade: true — so the `cascade === false` assertion below
        // only passes if the PUBLIC branch explicitly turns cascade off.
        (privileges: any, types: any, name: any) =>
          ({
            grantedPrivileges: privileges,
            criterias: types,
            name,
            cascade: true,
          }) as any
      );
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

      await service.applyAuthorizationPolicy('space-1');

      // The PUBLIC-mode cascading content READ rule on the SPACE authorization
      // must never include PLATFORM_RESOURCE_ADMIN in its criteria.
      const publicContentReadRules = (
        authorizationPolicyService.createCredentialRule as any
      ).mock.results
        .map((r: any) => r.value)
        .filter(
          (rule: any) => rule.name === 'Public spaces content is visible to all'
        );
      expect(publicContentReadRules).toHaveLength(1);
      expect(publicContentReadRules[0].cascade).toBe(true);
      expect(
        publicContentReadRules[0].criterias.some(
          (c: any) => c.type === AuthorizationCredential.PLATFORM_RESOURCE_ADMIN
        )
      ).toBe(false);

      // PRA must still get its own non-cascading READ+READ_ABOUT rule on this
      // PUBLIC L1 — the About card and A9 target resolution still resolve.
      const resourceAdminRules = (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mock.results
        .map((r: any) => r.value)
        .filter(
          (rule: any) =>
            rule.criterias?.length === 1 &&
            rule.criterias[0] ===
              AuthorizationCredential.PLATFORM_RESOURCE_ADMIN
        );
      expect(resourceAdminRules).toHaveLength(1);
      expect(resourceAdminRules[0].grantedPrivileges).toEqual([
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.READ_ABOUT,
      ]);
      expect(resourceAdminRules[0].cascade).toBe(false);
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

    it('should skip templatesManager cascade and continue when L0 space is missing templatesManager', async () => {
      // After the resilientCascade wrap, missing templatesManager no longer
      // aborts the whole cascade — it's logged and the parent continues to
      // about + profile.
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
      (
        spaceAboutAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        profileAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      logger.error.mockClear();

      const result = await service.propagateAuthorizationToChildEntities(
        space as any,
        true,
        []
      );

      expect(result).toBeDefined();
      // templatesManager cascade was skipped (templatesManager.applyAuthorizationPolicy not called)
      expect(
        templatesManagerAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
      // ...but about + profile still ran (they come after templatesManager)
      expect(
        spaceAboutAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      // ...and the resilient-cascade logged the skip with step + space context.
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /Auth-reset cascade step 'templatesManager' skipped for space space-1/
        ),
        expect.any(String),
        LogContext.AUTH
      );
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

  describe('member file upload on space storage (allowMembersToCreateCallouts)', () => {
    // Mocks needed for propagateAuthorizationToChildEntities to run, plus a
    // createCredentialRule that echoes its args so we can inspect the rule that
    // is passed down to the storage aggregator.
    const setupPropagateMocks = () => {
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
      (
        profileAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        authorizationPolicyService.createCredentialRule as any
      ).mockImplementation(
        (grantedPrivileges: any, criterias: any, name: any) => ({
          grantedPrivileges,
          criterias,
          name,
          cascade: false,
        })
      );
    };

    // The member FILE_UPLOAD grant is applied on the Space profile, so it
    // cascades to the Space profile's own storage bucket
    // (`space.profile.storageBucket`) — the Space-level location used to stage
    // new callout content during creation.
    const getSpaceProfileRulesArg = () =>
      (profileAuthorizationService.applyAuthorizationPolicy as any).mock
        .calls[0][2] ?? [];

    const getStorageAggregatorCall = () =>
      (storageAggregatorAuthorizationService.applyAuthorizationPolicy as any)
        .mock.calls[0];

    const getSpaceAboutRulesArg = () =>
      (spaceAboutAuthorizationService.applyAuthorizationPolicy as any).mock
        .calls[0][2] ?? [];

    const findFileUploadRule = (rules: any[]) =>
      rules.find(
        (rule: any) =>
          rule.name === CREDENTIAL_RULE_SPACE_STORAGE_MEMBER_FILE_UPLOAD
      );

    it('[US1] grants FILE_UPLOAD to members on the Space profile storage when allowMembersToCreateCallouts is true', async () => {
      const memberCriterias = [
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: 'space-1' },
      ];
      const space = createMockSpace();
      setupPropagateMocks();
      (roleSetService.getCredentialsForRole as any).mockResolvedValue(
        memberCriterias
      );
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(undefined);

      await service.propagateAuthorizationToChildEntities(
        space as any,
        true,
        []
      );

      // Applied against the Space's own profile and authorization
      const profileCall = (
        profileAuthorizationService.applyAuthorizationPolicy as any
      ).mock.calls[0];
      expect(profileCall[0]).toBe(space.profile!.id);
      expect(profileCall[1]).toBe(space.authorization);

      const rulesArg = profileCall[2];
      expect(rulesArg).toHaveLength(1);
      expect(rulesArg[0].name).toBe(
        CREDENTIAL_RULE_SPACE_STORAGE_MEMBER_FILE_UPLOAD
      );
      expect(rulesArg[0].grantedPrivileges).toContain(
        AuthorizationPrivilege.FILE_UPLOAD
      );
      // Must cascade to reach the Space profile's storage bucket
      expect(rulesArg[0].cascade).toBe(true);
    });

    it('[US1] does NOT grant FILE_UPLOAD on the storage aggregator or the About profile', async () => {
      // The grant must land only on the Space profile's storage bucket — never
      // on the storage aggregator's directStorage nor the About profile storage.
      const space = createMockSpace();
      setupPropagateMocks();
      (roleSetService.getCredentialsForRole as any).mockResolvedValue([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: 'space-1' },
      ]);
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(undefined);

      await service.propagateAuthorizationToChildEntities(
        space as any,
        true,
        []
      );

      // Storage aggregator is invoked with no extra credential rules argument
      expect(getStorageAggregatorCall()[2]).toBeUndefined();
      // About path carries only the read rule, no FILE_UPLOAD grant
      expect(findFileUploadRule(getSpaceAboutRulesArg())).toBeUndefined();
    });

    it('[US2] does NOT grant FILE_UPLOAD on the Space profile when allowMembersToCreateCallouts is false', async () => {
      const offSettings = {
        ...defaultSettings,
        collaboration: {
          ...defaultSettings.collaboration,
          allowMembersToCreateCallouts: false,
        },
      };
      const space = createMockSpace({ settings: offSettings });
      setupPropagateMocks();
      (roleSetService.getCredentialsForRole as any).mockResolvedValue([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: 'space-1' },
      ]);
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(undefined);

      await service.propagateAuthorizationToChildEntities(
        space as any,
        true,
        []
      );

      // No credential rules handed to the Space profile
      expect(getSpaceProfileRulesArg()).toEqual([]);
    });

    it('[US2] does NOT grant FILE_UPLOAD when membership is not allowed (e.g. archived space) even if allowMembersToCreateCallouts is true', async () => {
      // Archived spaces pass spaceMembershipAllowed=false; the upload mutation
      // authorizes solely on FILE_UPLOAD, so the rule must be suppressed here to
      // avoid granting upload access on an archived space's storage bucket.
      const space = createMockSpace(); // defaultSettings: allowMembersToCreateCallouts = true
      setupPropagateMocks();
      (roleSetService.getCredentialsForRole as any).mockResolvedValue([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: 'space-1' },
      ]);
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(undefined);

      await service.propagateAuthorizationToChildEntities(
        space as any,
        false, // spaceMembershipAllowed = false
        []
      );

      expect(getSpaceProfileRulesArg()).toEqual([]);
    });

    it('[US3] targets create-callout actor criteria including inherited parent members and cascades', async () => {
      // defaultSettings: inheritMembershipRights = true and PUBLIC privacy, so
      // getActorCriteria appends the parent-space member credential.
      const memberCredential = {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'space-1',
      };
      const parentMemberCredential = {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'parent-space-1',
      };
      const space = createMockSpace();
      setupPropagateMocks();
      (roleSetService.getCredentialsForRole as any).mockResolvedValue([
        memberCredential,
      ]);
      (
        roleSetService.getDirectParentCredentialForRole as any
      ).mockResolvedValue(parentMemberCredential);

      await service.propagateAuthorizationToChildEntities(
        space as any,
        true,
        []
      );

      const rulesArg = getSpaceProfileRulesArg();
      expect(rulesArg).toHaveLength(1);
      expect(rulesArg[0].grantedPrivileges).toEqual([
        AuthorizationPrivilege.FILE_UPLOAD,
      ]);
      expect(rulesArg[0].cascade).toBe(true);
      expect(rulesArg[0].criterias).toEqual(
        expect.arrayContaining([memberCredential, parentMemberCredential])
      );
    });
  });
});

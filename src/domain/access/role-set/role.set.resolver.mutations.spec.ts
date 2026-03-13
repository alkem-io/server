import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { ValidationException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RoleSetResolverMutations } from './role.set.resolver.mutations';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';

describe('RoleSetResolverMutations', () => {
  let resolver: RoleSetResolverMutations;
  let roleSetService: RoleSetService;
  let authorizationService: AuthorizationService;
  let userLookupService: UserLookupService;
  let organizationLookupService: OrganizationLookupService;
  let virtualContributorLookupService: VirtualContributorLookupService;
  let actorLookupService: ActorLookupService;
  let roleSetAuthorizationService: RoleSetAuthorizationService;
  let userAuthorizationService: UserAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let licenseService: LicenseService;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    roleSetService = module.get<RoleSetService>(RoleSetService);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    userLookupService = module.get<UserLookupService>(UserLookupService);
    organizationLookupService = module.get<OrganizationLookupService>(
      OrganizationLookupService
    );
    virtualContributorLookupService =
      module.get<VirtualContributorLookupService>(
        VirtualContributorLookupService
      );
    actorLookupService = module.get<ActorLookupService>(ActorLookupService);
    roleSetAuthorizationService = module.get<RoleSetAuthorizationService>(
      RoleSetAuthorizationService
    );
    userAuthorizationService = module.get<UserAuthorizationService>(
      UserAuthorizationService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    licenseService = module.get<LicenseService>(LicenseService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('assignRoleToUser', () => {
    it('should assign role to user on SPACE roleSet', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;
      const mockUser = { id: 'user-1' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue('user-1');
      (
        userAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue(mockUser);

      const result = await resolver.assignRoleToUser(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'user-1',
        role: RoleName.LEAD,
      } as any);

      expect(result).toBe(mockUser);
    });

    it('should use ROLESET_ENTRY_ROLE_ASSIGN privilege for MEMBER role on SPACE', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue('user-1');
      (
        userAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue({
        id: 'user-1',
      });

      await resolver.assignRoleToUser(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'user-1',
        role: RoleName.MEMBER,
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN,
        expect.any(String)
      );
    });

    it('should throw for unsupported roleSet type', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: 'UNSUPPORTED' as any,
        authorization: { id: 'auth-1' },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);

      await expect(
        resolver.assignRoleToUser(actorContext, {
          roleSetID: 'rs-1',
          actorID: 'user-1',
          role: RoleName.MEMBER,
        } as any)
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('assignRoleToOrganization', () => {
    it('should assign role to organization on SPACE roleSet', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;
      const mockOrg = { id: 'org-1' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue('org-1');
      (
        organizationLookupService.getOrganizationByIdOrFail as Mock
      ).mockResolvedValue(mockOrg);

      const result = await resolver.assignRoleToOrganization(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'org-1',
        role: RoleName.MEMBER,
      } as any);

      expect(result).toBe(mockOrg);
      // Should check both ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION and GRANT
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2);
    });
  });

  describe('assignRoleToVirtualContributor', () => {
    it('should assign role to VC on SPACE roleSet', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1' },
      } as any;
      const mockVC = { id: 'vc-1' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (
        roleSetService.isRoleSetAccountMatchingVcAccount as Mock
      ).mockResolvedValue(false);
      (licenseService.isEntitlementEnabledOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue('vc-1');
      (
        virtualContributorLookupService.getVirtualContributorByIdOrFail as Mock
      ).mockResolvedValue(mockVC);

      const result = await resolver.assignRoleToVirtualContributor(
        actorContext,
        {
          roleSetID: 'rs-1',
          actorID: 'vc-1',
          role: RoleName.MEMBER,
        } as any
      );

      expect(result).toBe(mockVC);
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove role from user on SPACE roleSet', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;
      const mockUser = { id: 'user-1' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue('user-1');
      (
        userAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue(mockUser);

      const result = await resolver.removeRoleFromUser(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'user-1',
        role: RoleName.LEAD,
      } as any);

      expect(result).toBe(mockUser);
    });

    it('should extend authorization for self-removal when removing MEMBER on SPACE', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;
      const extendedAuth = { id: 'extended-auth' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (
        roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval as Mock
      ).mockReturnValue(extendedAuth);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue('user-1');
      (
        userAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue({
        id: 'user-1',
      });

      await resolver.removeRoleFromUser(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'user-1',
        role: RoleName.MEMBER,
      } as any);

      expect(
        roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval
      ).toHaveBeenCalledWith(mockRoleSet, 'user-1');
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        extendedAuth,
        AuthorizationPrivilege.GRANT,
        expect.any(String)
      );
    });
  });

  describe('removeRoleFromOrganization', () => {
    it('should remove role from organization', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;
      const mockOrg = { id: 'org-1' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue('org-1');
      (
        organizationLookupService.getOrganizationByIdOrFail as Mock
      ).mockResolvedValue(mockOrg);

      const result = await resolver.removeRoleFromOrganization(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'org-1',
        role: RoleName.MEMBER,
      } as any);

      expect(result).toBe(mockOrg);
    });
  });

  describe('removeRoleFromVirtualContributor', () => {
    it('should remove role from virtual contributor', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;
      const mockVC = { id: 'vc-1' } as any;
      const extendedAuth = { id: 'extended-auth' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (
        roleSetAuthorizationService.extendAuthorizationPolicyForVirtualContributorRemoval as Mock
      ).mockResolvedValue(extendedAuth);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue('vc-1');
      (
        virtualContributorLookupService.getVirtualContributorByIdOrFail as Mock
      ).mockResolvedValue(mockVC);

      const result = await resolver.removeRoleFromVirtualContributor(
        actorContext,
        {
          roleSetID: 'rs-1',
          actorID: 'vc-1',
          role: RoleName.MEMBER,
        } as any
      );

      expect(result).toBe(mockVC);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user actor', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockActor = { id: 'user-1', type: ActorType.USER } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;

      (actorLookupService.getActorByIdOrFail as Mock).mockResolvedValue(
        mockActor
      );
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue('user-1');
      (
        userAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);

      const result = await resolver.assignRole(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'user-1',
        role: RoleName.MEMBER,
      } as any);

      expect(result).toBe(mockActor);
    });

    it('should assign role to organization actor', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockActor = { id: 'org-1', type: ActorType.ORGANIZATION } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;

      (actorLookupService.getActorByIdOrFail as Mock).mockResolvedValue(
        mockActor
      );
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue('org-1');

      const result = await resolver.assignRole(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'org-1',
        role: RoleName.MEMBER,
      } as any);

      expect(result).toBe(mockActor);
    });

    it('should throw for unsupported actor type', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockActor = { id: 'x-1', type: 'UNKNOWN' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;

      (actorLookupService.getActorByIdOrFail as Mock).mockResolvedValue(
        mockActor
      );
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);

      await expect(
        resolver.assignRole(actorContext, {
          roleSetID: 'rs-1',
          actorID: 'x-1',
          role: RoleName.MEMBER,
        } as any)
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('assignRoleToUser - ORGANIZATION roleSet', () => {
    it('should use GRANT privilege for ORGANIZATION', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.ORGANIZATION,
        authorization: { id: 'auth-1' },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue('user-1');
      (
        userAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue({
        id: 'user-1',
      });

      await resolver.assignRoleToUser(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'user-1',
        role: RoleName.ADMIN,
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.GRANT,
        expect.any(String)
      );
    });
  });

  describe('assignRoleToVirtualContributor - same account', () => {
    it('should use COMMUNITY_ASSIGN_VC_FROM_ACCOUNT when same account', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1' },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (
        roleSetService.isRoleSetAccountMatchingVcAccount as Mock
      ).mockResolvedValue(true); // same account
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (licenseService.isEntitlementEnabledOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue('vc-1');
      (
        virtualContributorLookupService.getVirtualContributorByIdOrFail as Mock
      ).mockResolvedValue({ id: 'vc-1' });

      await resolver.assignRoleToVirtualContributor(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'vc-1',
        role: RoleName.MEMBER,
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.COMMUNITY_ASSIGN_VC_FROM_ACCOUNT,
        expect.any(String)
      );
    });
  });

  describe('removeRoleFromUser - ORGANIZATION with ASSOCIATE self-removal', () => {
    it('should extend authorization for ASSOCIATE self-removal on ORGANIZATION', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.ORGANIZATION,
        authorization: { id: 'auth-1' },
      } as any;
      const extendedAuth = { id: 'extended-auth' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (
        roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval as Mock
      ).mockReturnValue(extendedAuth);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue('user-1');
      (
        userAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue({
        id: 'user-1',
      });

      await resolver.removeRoleFromUser(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'user-1',
        role: RoleName.ASSOCIATE,
      } as any);

      expect(
        roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval
      ).toHaveBeenCalledWith(mockRoleSet, 'user-1');
    });
  });

  describe('removeRole', () => {
    it('should remove role from user actor', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockActor = { id: 'user-1', type: ActorType.USER } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;

      (actorLookupService.getActorByIdOrFail as Mock).mockResolvedValue(
        mockActor
      );
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue('user-1');
      (
        userAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);

      const result = await resolver.removeRole(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'user-1',
        role: RoleName.MEMBER,
      } as any);

      expect(result).toBe(mockActor);
    });

    it('should remove role from virtual contributor actor', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockActor = {
        id: 'vc-1',
        type: ActorType.VIRTUAL_CONTRIBUTOR,
      } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;
      const extendedAuth = { id: 'ext-auth' } as any;

      (actorLookupService.getActorByIdOrFail as Mock).mockResolvedValue(
        mockActor
      );
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (
        roleSetAuthorizationService.extendAuthorizationPolicyForVirtualContributorRemoval as Mock
      ).mockResolvedValue(extendedAuth);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue('vc-1');

      const result = await resolver.removeRole(actorContext, {
        roleSetID: 'rs-1',
        actorID: 'vc-1',
        role: RoleName.MEMBER,
      } as any);

      expect(result).toBe(mockActor);
    });

    it('should throw for unsupported actor type', async () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockActor = { id: 'x-1', type: 'UNKNOWN' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;

      (actorLookupService.getActorByIdOrFail as Mock).mockResolvedValue(
        mockActor
      );
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);

      await expect(
        resolver.removeRole(actorContext, {
          roleSetID: 'rs-1',
          actorID: 'x-1',
          role: RoleName.MEMBER,
        } as any)
      ).rejects.toThrow(ValidationException);
    });
  });
});

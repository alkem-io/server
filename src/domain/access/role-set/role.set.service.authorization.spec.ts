import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { ApplicationAuthorizationService } from '@domain/access/application/application.service.authorization';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { PlatformInvitationAuthorizationService } from '@domain/access/invitation.platform/platform.invitation.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';

describe('RoleSetAuthorizationService', () => {
  let service: RoleSetAuthorizationService;
  let roleSetService: RoleSetService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let applicationAuthorizationService: ApplicationAuthorizationService;
  let invitationAuthorizationService: InvitationAuthorizationService;
  let platformInvitationAuthorizationService: PlatformInvitationAuthorizationService;
  let licenseAuthorizationService: LicenseAuthorizationService;
  let virtualActorLookupService: VirtualActorLookupService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<RoleSetAuthorizationService>(
      RoleSetAuthorizationService
    );
    roleSetService = module.get<RoleSetService>(RoleSetService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    applicationAuthorizationService =
      module.get<ApplicationAuthorizationService>(
        ApplicationAuthorizationService
      );
    invitationAuthorizationService = module.get<InvitationAuthorizationService>(
      InvitationAuthorizationService
    );
    platformInvitationAuthorizationService =
      module.get<PlatformInvitationAuthorizationService>(
        PlatformInvitationAuthorizationService
      );
    licenseAuthorizationService = module.get<LicenseAuthorizationService>(
      LicenseAuthorizationService
    );
    virtualActorLookupService = module.get<VirtualActorLookupService>(
      VirtualActorLookupService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw when required relations are not loaded', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        roles: undefined,
        applications: [],
        invitations: [],
        platformInvitations: [],
        license: { id: 'lic-1' },
        authorization: {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
        },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);

      await expect(
        service.applyAuthorizationPolicy('rs-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should return authorization policies when all relations loaded', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        roles: [{ name: 'member', credential: { type: 't', resourceID: 'r' } }],
        applications: [],
        invitations: [],
        platformInvitations: [],
        license: { id: 'lic-1' },
        authorization: {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
        },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mockRoleSet.authorization);
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as Mock
      ).mockReturnValue({ name: 'rule' });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mockRoleSet.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(mockRoleSet.authorization);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockReturnValue([]);

      const result = await service.applyAuthorizationPolicy('rs-1', undefined);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('applyAuthorizationPolicyOnInvitationsApplications', () => {
    it('should throw when invitations are not loaded', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        invitations: undefined,
        platformInvitations: [],
        applications: [],
      } as any;

      await expect(
        service.applyAuthorizationPolicyOnInvitationsApplications(mockRoleSet)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when platformInvitations are not loaded', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        invitations: [],
        platformInvitations: undefined,
        applications: [],
      } as any;

      await expect(
        service.applyAuthorizationPolicyOnInvitationsApplications(mockRoleSet)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when applications are not loaded', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        invitations: [],
        platformInvitations: [],
        applications: undefined,
      } as any;

      await expect(
        service.applyAuthorizationPolicyOnInvitationsApplications(mockRoleSet)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should return empty array when all collections are empty', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        invitations: [],
        platformInvitations: [],
        applications: [],
        authorization: { id: 'auth-1' },
      } as any;

      const result =
        await service.applyAuthorizationPolicyOnInvitationsApplications(
          mockRoleSet
        );

      expect(result).toEqual([]);
    });

    it('should process applications, invitations, and platform invitations', async () => {
      const mockApp = { id: 'app-1' } as any;
      const mockInv = { id: 'inv-1' } as any;
      const mockPInv = { id: 'pinv-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        invitations: [mockInv],
        platformInvitations: [mockPInv],
        applications: [mockApp],
        authorization: { id: 'auth-1' },
      } as any;

      const appAuth = { id: 'app-auth' } as any;
      const invAuth = { id: 'inv-auth' } as any;
      const pInvAuth = { id: 'pinv-auth' } as any;

      (
        applicationAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue(appAuth);
      (
        invitationAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue(invAuth);
      (
        platformInvitationAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue(pInvAuth);

      const result =
        await service.applyAuthorizationPolicyOnInvitationsApplications(
          mockRoleSet
        );

      expect(result).toHaveLength(3);
      expect(result).toContain(appAuth);
      expect(result).toContain(invAuth);
      expect(result).toContain(pInvAuth);
    });
  });

  describe('extendAuthorizationPolicyForSelfRemoval', () => {
    it('should create self-removal authorization policy', () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        authorization: mockAuth,
      } as any;

      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'self-removal' }
      );
      (
        authorizationPolicyService.cloneAuthorizationPolicy as Mock
      ).mockReturnValue({ ...mockAuth });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue({ id: 'updated-auth' });

      const result = service.extendAuthorizationPolicyForSelfRemoval(
        mockRoleSet,
        'user-1'
      );

      expect(result).toEqual({ id: 'updated-auth' });
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
      expect(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).toHaveBeenCalledWith(mockAuth);
    });
  });

  describe('extendAuthorizationPolicyForVirtualContributorRemoval', () => {
    it('should create VC removal authorization policy', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        authorization: mockAuth,
      } as any;
      const mockAccount = { id: 'account-1' } as any;

      (virtualActorLookupService.getAccountOrFail as Mock).mockResolvedValue(
        mockAccount
      );
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'vc-removal' }
      );
      (
        authorizationPolicyService.cloneAuthorizationPolicy as Mock
      ).mockReturnValue({ ...mockAuth });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue({ id: 'updated-auth' });

      const result =
        await service.extendAuthorizationPolicyForVirtualContributorRemoval(
          mockRoleSet,
          'vc-1'
        );

      expect(result).toEqual({ id: 'updated-auth' });
      expect(virtualActorLookupService.getAccountOrFail).toHaveBeenCalledWith(
        'vc-1'
      );
    });
  });
});

import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CollaborationService } from './collaboration.service';
import { CollaborationAuthorizationService } from './collaboration.service.authorization';

describe('CollaborationAuthorizationService', () => {
  let service: CollaborationAuthorizationService;
  let collaborationService: CollaborationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let roleSetService: RoleSetService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CollaborationAuthorizationService);
    collaborationService = module.get(CollaborationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    roleSetService = module.get(RoleSetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    const parentAuth = {
      id: 'parent-auth',
      credentialRules: [],
      privilegeRules: [],
    } as any;
    const platformRolesAccess = { roles: [] } as any;

    it('should throw RelationshipNotFoundException when child entities are missing', async () => {
      const collaboration = {
        id: 'collab-1',
        calloutsSet: undefined,
        innovationFlow: undefined,
        authorization: { id: 'auth-1', credentialRules: [] },
      } as any;

      vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue(
        collaboration
      );

      await expect(
        service.applyAuthorizationPolicy(
          { id: 'collab-1' } as any,
          parentAuth,
          platformRolesAccess
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should apply authorization and propagate to child entities', async () => {
      const collaboration = {
        id: 'collab-1',
        calloutsSet: { id: 'cs-1' },
        innovationFlow: { id: 'if-1', profile: { id: 'p-1' } },
        timeline: { id: 'tl-1' },
        license: { id: 'lic-1', entitlements: [] },
        authorization: {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
        },
      } as any;

      vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue(
        collaboration
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(collaboration.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(collaboration.authorization);
      vi.mocked(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).mockReturnValue({
        ...collaboration.authorization,
        credentialRules: [],
      });

      // Mock child authorization services
      const calloutsSetAuthService = (service as any)
        .calloutsSetAuthorizationService;
      vi.mocked(
        calloutsSetAuthService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const innovationFlowAuthService = (service as any)
        .innovationFlowAuthorizationService;
      vi.mocked(
        innovationFlowAuthService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const licenseAuthService = (service as any).licenseAuthorizationService;
      vi.mocked(licenseAuthService.applyAuthorizationPolicy).mockReturnValue(
        []
      );

      const result = await service.applyAuthorizationPolicy(
        { id: 'collab-1' } as any,
        parentAuth,
        platformRolesAccess
      );

      expect(result).toBeDefined();
      expect(result).toContain(collaboration.authorization);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
    });

    it('should apply contributor rules when roleSet and spaceSettings are provided', async () => {
      const collaboration = {
        id: 'collab-1',
        calloutsSet: { id: 'cs-1' },
        innovationFlow: { id: 'if-1', profile: { id: 'p-1' } },
        timeline: { id: 'tl-1' },
        license: { id: 'lic-1', entitlements: [] },
        authorization: {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
        },
      } as any;

      vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue(
        collaboration
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(collaboration.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(collaboration.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [], criterias: [] } as any);
      vi.mocked(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).mockReturnValue({
        ...collaboration.authorization,
        credentialRules: [],
      });
      vi.mocked(roleSetService.getCredentialsForRole).mockResolvedValue([]);
      vi.mocked(
        roleSetService.getCredentialsForRoleWithParents
      ).mockResolvedValue([]);

      const calloutsSetAuthService = (service as any)
        .calloutsSetAuthorizationService;
      vi.mocked(
        calloutsSetAuthService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const innovationFlowAuthService = (service as any)
        .innovationFlowAuthorizationService;
      vi.mocked(
        innovationFlowAuthService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const licenseAuthService = (service as any).licenseAuthorizationService;
      vi.mocked(licenseAuthService.applyAuthorizationPolicy).mockReturnValue(
        []
      );

      const timelineAuthService = (service as any).timelineAuthorizationService;
      vi.mocked(timelineAuthService.applyAuthorizationPolicy).mockResolvedValue(
        []
      );

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const roleSet = { id: 'rs-1' } as any;
      const spaceSettings = {
        collaboration: { inheritMembershipRights: false },
      } as any;

      const result = await service.applyAuthorizationPolicy(
        { id: 'collab-1' } as any,
        parentAuth,
        platformRolesAccess,
        roleSet,
        spaceSettings
      );

      expect(result).toBeDefined();
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });
  });

  describe('appendCredentialRulesForContributors', () => {
    it('should throw EntityNotInitializedException when authorization is undefined', async () => {
      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      await expect(
        service.appendCredentialRulesForContributors(
          undefined,
          { id: 'rs-1' } as any,
          {
            collaboration: { inheritMembershipRights: false },
          } as any,
          { roles: [] } as any
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should append contributor credential rules', async () => {
      const authorization = {
        id: 'auth-1',
        credentialRules: [],
      } as any;

      vi.mocked(roleSetService.getCredentialsForRole).mockResolvedValue([
        { type: 'space-member', resourceID: 'space-1' },
      ] as any);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: ['CONTRIBUTE'] } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(authorization);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const result = await service.appendCredentialRulesForContributors(
        authorization,
        { id: 'rs-1' } as any,
        { collaboration: { inheritMembershipRights: false } } as any,
        { roles: [] } as any
      );

      expect(result).toBe(authorization);
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should include parent member credentials when inheritMembershipRights is true', async () => {
      const authorization = {
        id: 'auth-1',
        credentialRules: [],
      } as any;

      vi.mocked(
        roleSetService.getCredentialsForRoleWithParents
      ).mockResolvedValue([
        { type: 'space-member', resourceID: 'parent-space-1' },
      ] as any);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: ['CONTRIBUTE'] } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(authorization);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      await service.appendCredentialRulesForContributors(
        authorization,
        { id: 'rs-1' } as any,
        { collaboration: { inheritMembershipRights: true } } as any,
        { roles: [] } as any
      );

      expect(
        roleSetService.getCredentialsForRoleWithParents
      ).toHaveBeenCalled();
    });
  });
});

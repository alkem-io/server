import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { TimelineAuthorizationService } from '@domain/timeline/timeline/timeline.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutsSetAuthorizationService } from '../callouts-set/callouts.set.service.authorization';
import { InnovationFlowAuthorizationService } from '../innovation-flow/innovation.flow.service.authorization';
import { CollaborationService } from './collaboration.service';
import { CollaborationAuthorizationService } from './collaboration.service.authorization';

describe('CollaborationAuthorizationService', () => {
  let service: CollaborationAuthorizationService;
  let collaborationService: CollaborationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let roleSetService: RoleSetService;
  let timelineAuthorizationService: TimelineAuthorizationService;
  let calloutsSetAuthorizationService: CalloutsSetAuthorizationService;
  let innovationFlowAuthorizationService: InnovationFlowAuthorizationService;
  let licenseAuthorizationService: LicenseAuthorizationService;
  let platformRolesAccessService: PlatformRolesAccessService;

  beforeEach(async () => {
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
    timelineAuthorizationService = module.get(TimelineAuthorizationService);
    calloutsSetAuthorizationService = module.get(
      CalloutsSetAuthorizationService
    );
    innovationFlowAuthorizationService = module.get(
      InnovationFlowAuthorizationService
    );
    licenseAuthorizationService = module.get(LicenseAuthorizationService);
    platformRolesAccessService = module.get(PlatformRolesAccessService);
  });

  const platformRolesAccess = { roles: [] } as any;
  const parentAuth = { id: 'auth-parent', credentialRules: [] } as any;

  function createCollaboration(overrides: any = {}) {
    return {
      id: 'collab-1',
      calloutsSet: { id: 'cs-1' },
      innovationFlow: { id: 'flow-1', profile: { id: 'profile-1' } },
      timeline: { id: 'tl-1' },
      license: { id: 'lic-1', entitlements: [] },
      authorization: { id: 'auth-collab', credentialRules: [] },
      ...overrides,
    } as any;
  }

  function setupBaseMocks(collaboration: any) {
    vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue(
      collaboration
    );
    vi.mocked(
      authorizationPolicyService.inheritParentAuthorization
    ).mockReturnValue(collaboration.authorization);
    vi.mocked(
      authorizationPolicyService.appendCredentialAuthorizationRules
    ).mockReturnValue(collaboration.authorization);
    vi.mocked(authorizationPolicyService.createCredentialRule).mockReturnValue({
      id: 'rule',
      cascade: true,
    } as any);
    vi.mocked(
      authorizationPolicyService.cloneAuthorizationPolicy
    ).mockReturnValue({ ...collaboration.authorization });
    vi.mocked(
      platformRolesAccessService.getCredentialsForRolesWithAccess
    ).mockReturnValue([]);
    vi.mocked(
      calloutsSetAuthorizationService.applyAuthorizationPolicy
    ).mockResolvedValue([]);
    vi.mocked(
      innovationFlowAuthorizationService.applyAuthorizationPolicy
    ).mockResolvedValue([]);
    vi.mocked(
      licenseAuthorizationService.applyAuthorizationPolicy
    ).mockReturnValue([]);
  }

  describe('applyAuthorizationPolicy', () => {
    it('should throw RelationshipNotFoundException when calloutsSet is missing', async () => {
      const collaboration = createCollaboration({ calloutsSet: undefined });
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

    it('should throw RelationshipNotFoundException when innovationFlow is missing', async () => {
      const collaboration = createCollaboration({
        innovationFlow: undefined,
      });
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

    it('should inherit parent authorization and propagate to child entities', async () => {
      const collaboration = createCollaboration();
      setupBaseMocks(collaboration);
      vi.mocked(roleSetService.getCredentialsForRole).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy(
        { id: 'collab-1' } as any,
        parentAuth,
        platformRolesAccess,
        { id: 'roleset-1' } as any
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
      expect(
        calloutsSetAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        innovationFlowAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('flow-1', collaboration.authorization);
      expect(result).toContain(collaboration.authorization);
    });

    it('should propagate to timeline when roleSet and spaceSettings are provided', async () => {
      const collaboration = createCollaboration();
      const roleSet = { id: 'roleset-1' } as any;
      const spaceSettings = {
        collaboration: { inheritMembershipRights: false },
      } as any;

      setupBaseMocks(collaboration);
      vi.mocked(roleSetService.getCredentialsForRole).mockResolvedValue([]);
      vi.mocked(
        timelineAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-timeline' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'collab-1' } as any,
        parentAuth,
        platformRolesAccess,
        roleSet,
        spaceSettings
      );

      expect(
        timelineAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should not propagate to timeline when collaboration has no timeline (template)', async () => {
      const collaboration = createCollaboration({ timeline: undefined });
      const roleSet = { id: 'roleset-1' } as any;
      const spaceSettings = {
        collaboration: { inheritMembershipRights: false },
      } as any;

      setupBaseMocks(collaboration);
      vi.mocked(roleSetService.getCredentialsForRole).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(
        { id: 'collab-1' } as any,
        parentAuth,
        platformRolesAccess,
        roleSet,
        spaceSettings
      );

      expect(
        timelineAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });

    it('should skip roleSet-specific rules when no roleSet is provided', async () => {
      const collaboration = createCollaboration();
      setupBaseMocks(collaboration);

      await service.applyAuthorizationPolicy(
        { id: 'collab-1' } as any,
        parentAuth,
        platformRolesAccess,
        undefined
      );

      expect(roleSetService.getCredentialsForRole).not.toHaveBeenCalled();
    });

    it('should append credential rules from parent', async () => {
      const collaboration = createCollaboration();
      setupBaseMocks(collaboration);

      const credentialRulesFromParent = [{ id: 'parent-rule' }] as any;

      await service.applyAuthorizationPolicy(
        { id: 'collab-1' } as any,
        parentAuth,
        platformRolesAccess,
        undefined,
        undefined,
        credentialRulesFromParent
      );

      expect(collaboration.authorization.credentialRules).toContain(
        credentialRulesFromParent[0]
      );
    });
  });

  describe('appendCredentialRulesForContributors', () => {
    it('should throw EntityNotInitializedException when authorization is undefined', async () => {
      const roleSet = { id: 'roleset-1' } as any;
      const spaceSettings = {
        collaboration: { inheritMembershipRights: false },
      } as any;

      await expect(
        service.appendCredentialRulesForContributors(
          undefined,
          roleSet,
          spaceSettings,
          platformRolesAccess
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should create contributor credential rule', async () => {
      const authorization = {
        id: 'auth-1',
        credentialRules: [],
      } as any;
      const roleSet = { id: 'roleset-1' } as any;
      const spaceSettings = {
        collaboration: { inheritMembershipRights: false },
      } as any;

      vi.mocked(roleSetService.getCredentialsForRole).mockResolvedValue([]);
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ id: 'contributor-rule' } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(authorization);

      const result = await service.appendCredentialRulesForContributors(
        authorization,
        roleSet,
        spaceSettings,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
      expect(result).toBe(authorization);
    });

    it('should include parent membership when inheritMembershipRights is true', async () => {
      const authorization = {
        id: 'auth-1',
        credentialRules: [],
      } as any;
      const roleSet = { id: 'roleset-1' } as any;
      const spaceSettings = {
        collaboration: { inheritMembershipRights: true },
      } as any;

      vi.mocked(
        roleSetService.getCredentialsForRoleWithParents
      ).mockResolvedValue([
        { type: 'space-member', resourceID: 'parent-space' },
      ]);
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ id: 'contributor-rule' } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(authorization);

      await service.appendCredentialRulesForContributors(
        authorization,
        roleSet,
        spaceSettings,
        platformRolesAccess
      );

      expect(
        roleSetService.getCredentialsForRoleWithParents
      ).toHaveBeenCalledWith(roleSet, expect.any(String));
    });
  });
});

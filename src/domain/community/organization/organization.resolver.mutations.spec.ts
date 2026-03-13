import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { OrganizationResolverMutations } from './organization.resolver.mutations';
import { OrganizationService } from './organization.service';
import { OrganizationAuthorizationService } from './organization.service.authorization';

describe('OrganizationResolverMutations', () => {
  let resolver: OrganizationResolverMutations;
  let organizationService: {
    getOrganizationOrFail: Mock;
    createGroup: Mock;
    updateOrganization: Mock;
    updateOrganizationSettings: Mock;
    save: Mock;
  };
  let authorizationService: { grantAccessOrFail: Mock };
  let authorizationPolicyService: { saveAll: Mock };
  let organizationAuthorizationService: { applyAuthorizationPolicy: Mock };
  let userGroupAuthorizationService: { applyAuthorizationPolicy: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(OrganizationResolverMutations);
    organizationService = module.get(OrganizationService) as any;
    authorizationService = module.get(AuthorizationService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    organizationAuthorizationService = module.get(
      OrganizationAuthorizationService
    ) as any;
    userGroupAuthorizationService = module.get(
      UserGroupAuthorizationService
    ) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createGroupOnOrganization', () => {
    it('should check CREATE privilege and create group', async () => {
      const mockOrg = { id: 'org-1', authorization: { id: 'auth-1' } };
      const mockGroup = { id: 'group-1' };
      const mockAuthorizations = [{ id: 'auth-2' }];

      organizationService.getOrganizationOrFail.mockResolvedValue(mockOrg);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      organizationService.createGroup.mockResolvedValue(mockGroup);
      userGroupAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        mockAuthorizations
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const actorContext = { actorID: 'user-1' } as any;
      const groupData = { parentID: 'org-1', profile: { displayName: 'G' } };

      const result = await resolver.createGroupOnOrganization(
        actorContext,
        groupData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockOrg.authorization,
        AuthorizationPrivilege.CREATE,
        expect.any(String)
      );
      expect(organizationService.createGroup).toHaveBeenCalledWith(groupData);
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith(
        mockAuthorizations
      );
      expect(result).toBe(mockGroup);
    });
  });

  describe('updateOrganization', () => {
    it('should check UPDATE privilege and update organization', async () => {
      const mockOrg = { id: 'org-1', authorization: { id: 'auth-1' } };
      const updatedOrg = { id: 'org-1', legalEntityName: 'Updated' };

      organizationService.getOrganizationOrFail.mockResolvedValue(mockOrg);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      organizationService.updateOrganization.mockResolvedValue(updatedOrg);

      const actorContext = { actorID: 'user-1' } as any;
      const orgData = { ID: 'org-1', legalEntityName: 'Updated' };

      const result = await resolver.updateOrganization(
        actorContext,
        orgData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockOrg.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(result).toBe(updatedOrg);
    });
  });

  describe('updateOrganizationSettings', () => {
    it('should check UPDATE privilege, update settings and reset authorization', async () => {
      const mockOrg = { id: 'org-1', authorization: { id: 'auth-1' } };
      const updatedOrg = { id: 'org-1', settings: {} };
      const mockAuthorizations = [{ id: 'auth-2' }];

      organizationService.getOrganizationOrFail
        .mockResolvedValueOnce(mockOrg)
        .mockResolvedValueOnce(updatedOrg);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      organizationService.updateOrganizationSettings.mockResolvedValue(
        updatedOrg
      );
      organizationService.save.mockResolvedValue(updatedOrg);
      organizationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        mockAuthorizations
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const actorContext = { actorID: 'user-1' } as any;
      const settingsData = {
        organizationID: 'org-1',
        settings: { membership: {} },
      };

      const result = await resolver.updateOrganizationSettings(
        actorContext,
        settingsData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(organizationService.updateOrganizationSettings).toHaveBeenCalled();
      expect(
        organizationAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result).toBe(updatedOrg);
    });
  });

  describe('authorizationPolicyResetOnOrganization', () => {
    it('should check AUTHORIZATION_RESET privilege and reset policy', async () => {
      const mockOrg = { id: 'org-1', authorization: { id: 'auth-1' } };
      const resetOrg = { id: 'org-1' };
      const mockAuthorizations = [{ id: 'auth-2' }];

      organizationService.getOrganizationOrFail
        .mockResolvedValueOnce(mockOrg)
        .mockResolvedValueOnce(resetOrg);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      organizationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        mockAuthorizations
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const actorContext = { actorID: 'admin-1' } as any;
      const result = await resolver.authorizationPolicyResetOnOrganization(
        actorContext,
        { organizationID: 'org-1' } as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockOrg.authorization,
        AuthorizationPrivilege.AUTHORIZATION_RESET,
        expect.any(String)
      );
      expect(result).toBe(resetOrg);
    });
  });
});

import { RelationshipNotFoundException } from '@common/exceptions';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { OrganizationVerificationAuthorizationService } from '../organization-verification/organization.verification.service.authorization';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { OrganizationService } from './organization.service';
import { OrganizationAuthorizationService } from './organization.service.authorization';

describe('OrganizationAuthorizationService', () => {
  let service: OrganizationAuthorizationService;
  let organizationService: { getOrganizationOrFail: Mock };
  let authorizationPolicyService: {
    reset: Mock;
    createCredentialRuleUsingTypesOnly: Mock;
    createCredentialRule: Mock;
    appendCredentialAuthorizationRules: Mock;
    cloneAuthorizationPolicy: Mock;
    appendCredentialRuleAnonymousRegisteredAccess: Mock;
  };
  let platformAuthorizationService: {
    inheritRootAuthorizationPolicy: Mock;
  };
  let profileAuthorizationService: { applyAuthorizationPolicy: Mock };
  let storageAggregatorAuthorizationService: {
    applyAuthorizationPolicy: Mock;
  };
  let roleSetAuthorizationService: { applyAuthorizationPolicy: Mock };
  let userGroupAuthorizationService: { applyAuthorizationPolicy: Mock };
  let organizationVerificationAuthorizationService: {
    applyAuthorizationPolicy: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(OrganizationAuthorizationService);
    organizationService = module.get(OrganizationService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    profileAuthorizationService = module.get(
      ProfileAuthorizationService
    ) as any;
    storageAggregatorAuthorizationService = module.get(
      StorageAggregatorAuthorizationService
    ) as any;
    roleSetAuthorizationService = module.get(
      RoleSetAuthorizationService
    ) as any;
    userGroupAuthorizationService = module.get(
      UserGroupAuthorizationService
    ) as any;
    organizationVerificationAuthorizationService = module.get(
      OrganizationVerificationAuthorizationService
    ) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw RelationshipNotFoundException when required relations missing', async () => {
      const org = {
        id: 'org-1',
        profile: null,
        storageAggregator: null,
        credentials: null,
        groups: null,
        verification: null,
        roleSet: null,
      };
      organizationService.getOrganizationOrFail.mockResolvedValue(org);

      await expect(
        service.applyAuthorizationPolicy({ id: 'org-1' } as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should apply full authorization policy and return array of policies', async () => {
      const authorization = { credentialRules: [] };
      const org = {
        id: 'org-1',
        accountID: 'account-1',
        authorization,
        profile: { id: 'profile-1' },
        storageAggregator: { id: 'sa-1' },
        credentials: [],
        groups: [{ id: 'group-1' }],
        verification: { id: 'ver-1' },
        roleSet: { id: 'rs-1' },
      };
      organizationService.getOrganizationOrFail.mockResolvedValue(org);
      authorizationPolicyService.reset.mockReturnValue(authorization);
      platformAuthorizationService.inheritRootAuthorizationPolicy.mockReturnValue(
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
      authorizationPolicyService.cloneAuthorizationPolicy.mockReturnValue(
        authorization
      );
      authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess.mockReturnValue(
        authorization
      );
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      storageAggregatorAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );
      roleSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      userGroupAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      organizationVerificationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        authorization
      );

      const result = await service.applyAuthorizationPolicy({
        id: 'org-1',
      } as any);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        storageAggregatorAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        roleSetAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        userGroupAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(1);
      expect(
        organizationVerificationAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
    });

    it('should cascade group authorizations for each group', async () => {
      const authorization = { credentialRules: [] };
      const org = {
        id: 'org-1',
        accountID: 'account-1',
        authorization,
        profile: { id: 'profile-1' },
        storageAggregator: { id: 'sa-1' },
        credentials: [],
        groups: [{ id: 'group-1' }, { id: 'group-2' }, { id: 'group-3' }],
        verification: { id: 'ver-1' },
        roleSet: { id: 'rs-1' },
      };
      organizationService.getOrganizationOrFail.mockResolvedValue(org);
      authorizationPolicyService.reset.mockReturnValue(authorization);
      platformAuthorizationService.inheritRootAuthorizationPolicy.mockReturnValue(
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
      authorizationPolicyService.cloneAuthorizationPolicy.mockReturnValue(
        authorization
      );
      authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess.mockReturnValue(
        authorization
      );
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      storageAggregatorAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );
      roleSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      userGroupAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      organizationVerificationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        authorization
      );

      await service.applyAuthorizationPolicy({ id: 'org-1' } as any);
      expect(
        userGroupAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(3);
    });
  });
});

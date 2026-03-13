import { SearchVisibility } from '@common/enums/search.visibility';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { KnowledgeBaseAuthorizationService } from '@domain/common/knowledge-base/knowledge.base.service.authorization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { VirtualContributorService } from './virtual.contributor.service';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';

describe('VirtualContributorAuthorizationService', () => {
  let service: VirtualContributorAuthorizationService;
  let virtualService: { getVirtualContributorByIdOrFail: Mock };
  let authorizationPolicyService: {
    reset: Mock;
    createCredentialRuleUsingTypesOnly: Mock;
    createCredentialRule: Mock;
    appendCredentialAuthorizationRules: Mock;
    cloneAuthorizationPolicy: Mock;
    appendCredentialRuleAnonymousRegisteredAccess: Mock;
    appendPrivilegeAuthorizationRuleMapping: Mock;
    getCredentialDefinitionsAnonymousRegistered: Mock;
  };
  let platformAuthorizationService: {
    inheritRootAuthorizationPolicy: Mock;
  };
  let profileAuthorizationService: { applyAuthorizationPolicy: Mock };
  let knowledgeBaseAuthorizationService: {
    applyAuthorizationPolicy: Mock;
  };
  let aiServerAdapter: { applyAuthorizationOnAiPersona: Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VirtualContributorAuthorizationService);
    virtualService = module.get(VirtualContributorService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    profileAuthorizationService = module.get(
      ProfileAuthorizationService
    ) as any;
    knowledgeBaseAuthorizationService = module.get(
      KnowledgeBaseAuthorizationService
    ) as any;
    aiServerAdapter = module.get(AiServerAdapter) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw RelationshipNotFoundException when required relations missing', async () => {
      const vc = {
        id: 'vc-1',
        account: null,
        profile: null,
        knowledgeBase: null,
      };
      virtualService.getVirtualContributorByIdOrFail.mockResolvedValue(vc);

      await expect(
        service.applyAuthorizationPolicy({ id: 'vc-1' } as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when account.spaces is missing', async () => {
      const vc = {
        id: 'vc-1',
        account: { id: 'account-1', spaces: null },
        profile: { id: 'profile-1' },
        knowledgeBase: { id: 'kb-1' },
      };
      virtualService.getVirtualContributorByIdOrFail.mockResolvedValue(vc);

      await expect(
        service.applyAuthorizationPolicy({ id: 'vc-1' } as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should apply full authorization and return policies array', async () => {
      const authorization = { credentialRules: [] };
      const vc = {
        id: 'vc-1',
        authorization,
        searchVisibility: SearchVisibility.PUBLIC,
        account: { id: 'account-1', spaces: [{ id: 'space-1' }] },
        profile: { id: 'profile-1' },
        knowledgeBase: { id: 'kb-1' },
        aiPersonaID: 'persona-1',
        settings: { privacy: { knowledgeBaseContentVisible: true } },
      };
      virtualService.getVirtualContributorByIdOrFail.mockResolvedValue(vc);
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
      authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping.mockReturnValue(
        authorization
      );
      authorizationPolicyService.getCredentialDefinitionsAnonymousRegistered.mockReturnValue(
        [{ type: 'anonymous', resourceID: '' }]
      );
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      aiServerAdapter.applyAuthorizationOnAiPersona.mockResolvedValue([
        authorization,
      ]);
      knowledgeBaseAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );

      const result = await service.applyAuthorizationPolicy({
        id: 'vc-1',
      } as any);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(aiServerAdapter.applyAuthorizationOnAiPersona).toHaveBeenCalled();
      expect(
        knowledgeBaseAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
    });

    it('should handle HIDDEN searchVisibility with no extra credentials', async () => {
      const authorization = { credentialRules: [] };
      const vc = {
        id: 'vc-1',
        authorization,
        searchVisibility: SearchVisibility.HIDDEN,
        account: { id: 'account-1', spaces: [] },
        profile: { id: 'profile-1' },
        knowledgeBase: { id: 'kb-1' },
        aiPersonaID: 'persona-1',
        settings: { privacy: { knowledgeBaseContentVisible: false } },
      };
      virtualService.getVirtualContributorByIdOrFail.mockResolvedValue(vc);
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
      authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping.mockReturnValue(
        authorization
      );
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      aiServerAdapter.applyAuthorizationOnAiPersona.mockResolvedValue([
        authorization,
      ]);
      knowledgeBaseAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );

      const result = await service.applyAuthorizationPolicy({
        id: 'vc-1',
      } as any);
      expect(result).toBeDefined();
      // Should not call getCredentialDefinitionsAnonymousRegistered for HIDDEN
      expect(
        authorizationPolicyService.getCredentialDefinitionsAnonymousRegistered
      ).not.toHaveBeenCalled();
    });

    it('should handle ACCOUNT searchVisibility with space member credentials', async () => {
      const authorization = { credentialRules: [] };
      const vc = {
        id: 'vc-1',
        authorization,
        searchVisibility: SearchVisibility.ACCOUNT,
        account: {
          id: 'account-1',
          spaces: [{ id: 'space-1' }, { id: 'space-2' }],
        },
        profile: { id: 'profile-1' },
        knowledgeBase: { id: 'kb-1' },
        aiPersonaID: 'persona-1',
        settings: { privacy: { knowledgeBaseContentVisible: true } },
      };
      virtualService.getVirtualContributorByIdOrFail.mockResolvedValue(vc);
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
      authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping.mockReturnValue(
        authorization
      );
      profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        authorization,
      ]);
      aiServerAdapter.applyAuthorizationOnAiPersona.mockResolvedValue([
        authorization,
      ]);
      knowledgeBaseAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [authorization]
      );

      const result = await service.applyAuthorizationPolicy({
        id: 'vc-1',
      } as any);
      expect(result).toBeDefined();
    });
  });
});

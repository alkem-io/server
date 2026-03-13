import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CalloutsSetAuthorizationService } from '@domain/collaboration/callouts-set/callouts.set.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IAuthorizationPolicy } from '../authorization-policy/authorization.policy.interface';
import { KnowledgeBaseService } from './knowledge.base.service';
import { KnowledgeBaseAuthorizationService } from './knowledge.base.service.authorization';

describe('KnowledgeBaseAuthorizationService', () => {
  let service: KnowledgeBaseAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let knowledgeBaseService: KnowledgeBaseService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let calloutsSetAuthorizationService: CalloutsSetAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(KnowledgeBaseAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    knowledgeBaseService = module.get(KnowledgeBaseService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    calloutsSetAuthorizationService = module.get(
      CalloutsSetAuthorizationService
    );
  });

  const createKnowledgeBase = (overrides: any = {}) => ({
    id: 'kb-1',
    authorization: {
      id: 'auth-1',
      credentialRules: [],
    } as unknown as IAuthorizationPolicy,
    profile: { id: 'profile-1' },
    calloutsSet: { id: 'cs-1' },
    ...overrides,
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent auth and apply to calloutsSet and profile', async () => {
      const knowledgeBase = createKnowledgeBase();
      const parentAuth = { id: 'parent' } as unknown as IAuthorizationPolicy;
      const knowledgeBaseInput = { id: 'kb-1' } as any;

      (knowledgeBaseService.getKnowledgeBaseOrFail as Mock).mockResolvedValue(
        knowledgeBase
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(knowledgeBase.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as Mock
      ).mockReturnValue(knowledgeBase.authorization);
      (
        calloutsSetAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy(
        knowledgeBaseInput,
        parentAuth,
        [],
        true
      );

      expect(knowledgeBaseService.getKnowledgeBaseOrFail).toHaveBeenCalledWith(
        'kb-1',
        expect.any(Object)
      );
      expect(
        calloutsSetAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should add READ credential rule when contents are visible', async () => {
      const knowledgeBase = createKnowledgeBase();
      const knowledgeBaseInput = { id: 'kb-1' } as any;
      const credentialCriteria = [{ type: 'test', resourceID: 'res-1' }] as any;

      (knowledgeBaseService.getKnowledgeBaseOrFail as Mock).mockResolvedValue(
        knowledgeBase
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(knowledgeBase.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { cascade: false }
      );
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as Mock
      ).mockReturnValue(knowledgeBase.authorization);
      (
        calloutsSetAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(
        knowledgeBaseInput,
        undefined,
        credentialCriteria,
        true
      );

      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should add READ_ABOUT credential rule when contents are not visible', async () => {
      const knowledgeBase = createKnowledgeBase();
      const knowledgeBaseInput = { id: 'kb-1' } as any;
      const credentialCriteria = [{ type: 'test', resourceID: 'res-1' }] as any;

      (knowledgeBaseService.getKnowledgeBaseOrFail as Mock).mockResolvedValue(
        knowledgeBase
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(knowledgeBase.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { cascade: false }
      );
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as Mock
      ).mockReturnValue(knowledgeBase.authorization);
      (
        calloutsSetAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(
        knowledgeBaseInput,
        undefined,
        credentialCriteria,
        false
      );

      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should not add credential rules when no credential criteria', async () => {
      const knowledgeBase = createKnowledgeBase();
      const knowledgeBaseInput = { id: 'kb-1' } as any;

      (knowledgeBaseService.getKnowledgeBaseOrFail as Mock).mockResolvedValue(
        knowledgeBase
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(knowledgeBase.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as Mock
      ).mockReturnValue(knowledgeBase.authorization);
      (
        calloutsSetAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(
        knowledgeBaseInput,
        undefined,
        [],
        true
      );

      expect(
        authorizationPolicyService.createCredentialRule
      ).not.toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundException when profile not loaded', async () => {
      const knowledgeBase = createKnowledgeBase({ profile: undefined });
      const knowledgeBaseInput = { id: 'kb-1' } as any;

      (knowledgeBaseService.getKnowledgeBaseOrFail as Mock).mockResolvedValue(
        knowledgeBase
      );

      await expect(
        service.applyAuthorizationPolicy(
          knowledgeBaseInput,
          undefined,
          [],
          true
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when calloutsSet not loaded', async () => {
      const knowledgeBase = createKnowledgeBase({ calloutsSet: undefined });
      const knowledgeBaseInput = { id: 'kb-1' } as any;

      (knowledgeBaseService.getKnowledgeBaseOrFail as Mock).mockResolvedValue(
        knowledgeBase
      );

      await expect(
        service.applyAuthorizationPolicy(
          knowledgeBaseInput,
          undefined,
          [],
          true
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});

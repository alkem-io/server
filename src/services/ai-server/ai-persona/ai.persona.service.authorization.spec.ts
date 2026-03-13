import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AiPersonaAuthorizationService } from './ai.persona.service.authorization';

describe('AiPersonaAuthorizationService', () => {
  let service: AiPersonaAuthorizationService;
  let authorizationPolicyService: Record<string, Mock>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiPersonaAuthorizationService],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AiPersonaAuthorizationService);
    // Both constructor params resolve to the same mock instance
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as unknown as Record<string, Mock>;
  });

  describe('applyAuthorizationPolicy', () => {
    it('should reset authorization and inherit parent authorization', async () => {
      const authorization = { id: 'auth-1' };
      const parentAuthorization = { id: 'parent-auth' } as any;
      const aiPersona = {
        id: 'persona-1',
        authorization,
      } as any;

      const resetAuth = { id: 'auth-reset' };
      const inheritedAuth = { id: 'auth-inherited' };
      const appendedAuth = { id: 'auth-appended' };

      authorizationPolicyService.reset.mockReturnValue(resetAuth);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        inheritedAuth
      );
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        appendedAuth
      );

      const result = await service.applyAuthorizationPolicy(
        aiPersona,
        parentAuthorization
      );

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(
        authorization
      );
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, parentAuthorization);
      expect(result).toHaveLength(1);
    });

    it('should throw RelationshipNotFoundException when aiPersona has no authorization', async () => {
      const aiPersona = {
        id: 'persona-1',
        authorization: undefined,
      } as any;

      await expect(
        service.applyAuthorizationPolicy(aiPersona, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should return an array with the updated authorization policy', async () => {
      const authorization = { id: 'auth-1' };
      const aiPersona = {
        id: 'persona-1',
        authorization,
      } as any;

      const resetAuth = { id: 'auth-reset' };
      const inheritedAuth = { id: 'auth-inherited' };

      authorizationPolicyService.reset.mockReturnValue(resetAuth);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        inheritedAuth
      );
      // appendCredentialAuthorizationRules is called on this.authorizationPolicy (same mock)
      // The result is what gets pushed to updatedAuthorizations
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        inheritedAuth
      );

      const result = await service.applyAuthorizationPolicy(
        aiPersona,
        undefined
      );

      // The array should contain at least the persona authorization
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});

import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AiPersonaAuthorizationService } from '@services/ai-server/ai-persona/ai.persona.service.authorization';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AiServerService } from './ai.server.service';
import { AiServerAuthorizationService } from './ai.server.service.authorization';

describe('AiServerAuthorizationService', () => {
  let service: AiServerAuthorizationService;
  let authorizationPolicyService: Record<string, Mock>;
  let aiServerService: Record<string, Mock>;
  let aiPersonaAuthorizationService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiServerAuthorizationService],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AiServerAuthorizationService);
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as unknown as Record<string, Mock>;
    aiServerService = module.get(AiServerService) as unknown as Record<
      string,
      Mock
    >;
    aiPersonaAuthorizationService = module.get(
      AiPersonaAuthorizationService
    ) as unknown as Record<string, Mock>;
  });

  describe('applyAuthorizationPolicy', () => {
    it('should reset server authorization, append credential rules, and process personas', async () => {
      const serverAuth = { id: 'server-auth' };
      const persona1 = { id: 'p1', authorization: { id: 'p1-auth' } };
      const persona2 = { id: 'p2', authorization: { id: 'p2-auth' } };
      const aiServer = {
        id: 'server-1',
        authorization: serverAuth,
        aiPersonas: [persona1, persona2],
      };

      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);
      authorizationPolicyService.reset.mockReturnValue(serverAuth);
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        serverAuth
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { name: 'rule' }
      );
      aiPersonaAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        { id: 'updated-persona-auth' },
      ]);

      const result = await service.applyAuthorizationPolicy();

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(serverAuth);
      expect(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).toHaveBeenCalled();
      expect(
        aiPersonaAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(2);
      // Server auth + 2 persona auths
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should throw RelationshipNotFoundException when server has no authorization', async () => {
      const aiServer = {
        id: 'server-1',
        authorization: undefined,
        aiPersonas: [],
      };
      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);

      await expect(service.applyAuthorizationPolicy()).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when server has no aiPersonas', async () => {
      const aiServer = {
        id: 'server-1',
        authorization: { id: 'auth-1' },
        aiPersonas: undefined,
      };
      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);

      await expect(service.applyAuthorizationPolicy()).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should handle server with empty personas array', async () => {
      const serverAuth = { id: 'server-auth' };
      const aiServer = {
        id: 'server-1',
        authorization: serverAuth,
        aiPersonas: [],
      };

      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);
      authorizationPolicyService.reset.mockReturnValue(serverAuth);
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        serverAuth
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        { name: 'rule' }
      );

      const result = await service.applyAuthorizationPolicy();

      expect(
        aiPersonaAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(serverAuth);
    });
  });
});

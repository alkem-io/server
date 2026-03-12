import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AiPersonaService } from '@services/ai-server/ai-persona/ai.persona.service';
import { AiPersonaAuthorizationService } from '@services/ai-server/ai-persona/ai.persona.service.authorization';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AiServerResolverMutations } from './ai.server.resolver.mutations';
import { AiServerService } from './ai.server.service';
import { AiServerAuthorizationService } from './ai.server.service.authorization';

describe('AiServerResolverMutations', () => {
  let resolver: AiServerResolverMutations;
  let authorizationService: Record<string, Mock>;
  let authorizationPolicyService: Record<string, Mock>;
  let aiServerService: Record<string, Mock>;
  let aiServerAuthorizationService: Record<string, Mock>;
  let aiPersonaService: Record<string, Mock>;
  let aiPersonaAuthorizationService: Record<string, Mock>;
  let _platformAuthorizationService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiServerResolverMutations,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: {
            findOne: vi.fn(),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AiServerResolverMutations);
    authorizationService = module.get(
      AuthorizationService
    ) as unknown as Record<string, Mock>;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as unknown as Record<string, Mock>;
    aiServerService = module.get(AiServerService) as unknown as Record<
      string,
      Mock
    >;
    aiServerAuthorizationService = module.get(
      AiServerAuthorizationService
    ) as unknown as Record<string, Mock>;
    aiPersonaService = module.get(AiPersonaService) as unknown as Record<
      string,
      Mock
    >;
    aiPersonaAuthorizationService = module.get(
      AiPersonaAuthorizationService
    ) as unknown as Record<string, Mock>;
    _platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as unknown as Record<string, Mock>;
  });

  describe('aiServerAuthorizationPolicyReset', () => {
    it('should check authorization, apply policy, save, and return server', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const aiServer = { id: 'server-1', authorization: { id: 'auth-1' } };
      const authorizations = [{ id: 'updated-auth' }];
      const updatedServer = {
        id: 'server-1',
        authorization: { id: 'new-auth' },
      };

      aiServerService.getAiServerOrFail
        .mockResolvedValueOnce(aiServer)
        .mockResolvedValueOnce(updatedServer);
      aiServerAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        authorizations
      );

      const result =
        await resolver.aiServerAuthorizationPolicyReset(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        aiServer.authorization,
        expect.any(String),
        expect.any(String)
      );
      expect(
        aiServerAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith(
        authorizations
      );
      expect(result).toEqual(updatedServer);
    });
  });

  describe('aiServerCreateAiPersona', () => {
    it('should check authorization, create persona, apply auth policy, and return persona', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const aiServer = { id: 'server-1', authorization: { id: 'auth-1' } };
      const aiPersonaData = { engine: 'expert', prompt: ['test'] } as any;
      const createdPersona = { id: 'p1', engine: 'expert' } as any;
      const savedPersona = { id: 'p1', engine: 'expert', aiServer } as any;
      const authorizations = [{ id: 'persona-auth' }];
      const finalPersona = { id: 'p1', engine: 'expert' } as any;

      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);
      aiPersonaService.createAiPersona.mockResolvedValue(createdPersona);
      aiPersonaService.save.mockResolvedValue(savedPersona);
      aiPersonaAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        authorizations
      );
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(finalPersona);

      const result = await resolver.aiServerCreateAiPersona(
        actorContext,
        aiPersonaData
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        aiServer.authorization,
        expect.any(String),
        expect.any(String)
      );
      expect(aiPersonaService.createAiPersona).toHaveBeenCalledWith(
        aiPersonaData,
        aiServer
      );
      expect(aiPersonaService.save).toHaveBeenCalled();
      expect(
        aiPersonaAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith(
        authorizations
      );
      expect(result).toEqual(finalPersona);
    });
  });
});

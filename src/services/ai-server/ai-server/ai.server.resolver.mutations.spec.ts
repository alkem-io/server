import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AiPersonaService } from '@services/ai-server/ai-persona/ai.persona.service';
import { AiPersonaAuthorizationService } from '@services/ai-server/ai-persona/ai.persona.service.authorization';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AiServerResolverMutations } from './ai.server.resolver.mutations';
import { AiServerService } from './ai.server.service';
import { AiServerAuthorizationService } from './ai.server.service.authorization';

describe('AiServerResolverMutations', () => {
  let module: TestingModule;
  let resolver: AiServerResolverMutations;
  let authorizationService: Record<string, Mock>;
  let authorizationPolicyService: Record<string, Mock>;
  let aiServerService: Record<string, Mock>;
  let aiServerAuthorizationService: Record<string, Mock>;
  let aiPersonaService: Record<string, Mock>;
  let aiPersonaAuthorizationService: Record<string, Mock>;
  let _platformAuthorizationService: Record<string, Mock>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
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
  // ===================================================================
  // qual-server-12 (2026-07-31) — A11's three mutations here each audit BOTH
  // outcomes (six call sites), and none was asserted. The failure rows
  // matter more than the success ones: `cleanupCollections` reaches an
  // external vector store and `aiServerAuthorizationPolicyReset` rewrites
  // policy, so "it was attempted and it broke" is precisely what an operator
  // needs to find afterwards. Deleting every `recordOperation` call in this
  // resolver left the suite green.
  // ===================================================================
  describe('audit coverage (qual-server-12)', () => {
    const actorContext = { actorID: 'user-1' } as any;
    const aiServer = { id: 'server-1', authorization: { id: 'auth-1' } };

    const operationsAudit = () =>
      module.get(PlatformOperationsAuditService) as any;

    it('aiServerAuthorizationPolicyReset records success', async () => {
      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);
      aiServerAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );

      await resolver.aiServerAuthorizationPolicyReset(actorContext);

      expect(operationsAudit().recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          actorID: 'user-1',
          action: 'aiServerAuthorizationPolicyReset',
          outcome: 'success',
        })
      );
    });

    it('aiServerAuthorizationPolicyReset records FAILURE and rethrows', async () => {
      const failure = new Error('policy apply exploded');
      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);
      aiServerAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
        failure
      );

      await expect(
        resolver.aiServerAuthorizationPolicyReset(actorContext)
      ).rejects.toBe(failure);

      expect(operationsAudit().recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'aiServerAuthorizationPolicyReset',
          outcome: 'failure',
          error: failure,
        })
      );
    });

    it('aiServerCreateAiPersona records success', async () => {
      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);
      aiPersonaService.createAiPersona.mockResolvedValue({ id: 'p1' });
      aiPersonaService.save.mockResolvedValue({ id: 'p1', aiServer });
      aiPersonaAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue({ id: 'p1' });

      await resolver.aiServerCreateAiPersona(actorContext, {
        engine: 'expert',
        prompt: ['test'],
      } as any);

      expect(operationsAudit().recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'aiServerCreateAiPersona',
          outcome: 'success',
        })
      );
    });

    it('aiServerCreateAiPersona records FAILURE and rethrows', async () => {
      const failure = new Error('persona create exploded');
      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);
      aiPersonaService.createAiPersona.mockRejectedValue(failure);

      await expect(
        resolver.aiServerCreateAiPersona(actorContext, {
          engine: 'expert',
          prompt: ['test'],
        } as any)
      ).rejects.toBe(failure);

      expect(operationsAudit().recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'aiServerCreateAiPersona',
          outcome: 'failure',
          error: failure,
        })
      );
    });

    it('cleanupCollections records FAILURE and rethrows when the vector store is unreachable', async () => {
      const failure = new Error('fetch failed');
      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);
      vi.spyOn(resolver as any, 'cleanupCollectionsInner').mockRejectedValue(
        failure
      );

      await expect(resolver.cleanupCollections(actorContext)).rejects.toBe(
        failure
      );

      expect(operationsAudit().recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cleanupCollections',
          outcome: 'failure',
          error: failure,
        })
      );
    });

    it('cleanupCollections records success', async () => {
      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);
      vi.spyOn(resolver as any, 'cleanupCollectionsInner').mockResolvedValue({
        success: true,
      } as any);

      await resolver.cleanupCollections(actorContext);

      expect(operationsAudit().recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cleanupCollections',
          outcome: 'success',
        })
      );
    });
  });
});

import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AiPersonaResolverMutations } from './ai.persona.resolver.mutations';
import { AiPersonaService } from './ai.persona.service';

describe('AiPersonaResolverMutations', () => {
  let resolver: AiPersonaResolverMutations;
  let aiPersonaService: Record<string, Mock>;
  let authorizationService: Record<string, Mock>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiPersonaResolverMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AiPersonaResolverMutations);
    aiPersonaService = module.get(AiPersonaService) as unknown as Record<
      string,
      Mock
    >;
    authorizationService = module.get(
      AuthorizationService
    ) as unknown as Record<string, Mock>;
  });

  describe('aiServerUpdateAiPersona', () => {
    it('should check authorization and update the persona', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const authorization = { id: 'auth-1' };
      const persona = { id: 'p1', authorization };
      const updateData = { ID: 'p1', prompt: ['new prompt'] };
      const updatedPersona = { id: 'p1', prompt: ['new prompt'] };

      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);
      aiPersonaService.updateAiPersona.mockResolvedValue(updatedPersona);

      const result = await resolver.aiServerUpdateAiPersona(
        actorContext,
        updateData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        authorization,
        expect.any(String),
        expect.any(String)
      );
      expect(aiPersonaService.updateAiPersona).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(updatedPersona);
    });
  });

  describe('aiServerDeleteAiPersona', () => {
    it('should check authorization and delete the persona', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const authorization = { id: 'auth-1' };
      const persona = { id: 'p1', authorization };
      const deleteData = { ID: 'p1' };
      const deletedPersona = { id: 'p1' };

      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);
      aiPersonaService.deleteAiPersona.mockResolvedValue(deletedPersona);

      const result = await resolver.aiServerDeleteAiPersona(
        actorContext,
        deleteData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        authorization,
        expect.any(String),
        expect.any(String)
      );
      expect(aiPersonaService.deleteAiPersona).toHaveBeenCalledWith(deleteData);
      expect(result).toEqual(deletedPersona);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AiServerResolverFields } from './ai.server.resolver.fields';
import { AiServerService } from './ai.server.service';

describe('AiServerResolverFields', () => {
  let resolver: AiServerResolverFields;
  let aiServerService: Record<string, Mock>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiServerResolverFields],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AiServerResolverFields);
    aiServerService = module.get(AiServerService) as unknown as Record<
      string,
      Mock
    >;
  });

  describe('authorization', () => {
    it('should delegate to aiServerService.getAuthorizationPolicy', () => {
      const authorization = { id: 'auth-1' };
      const aiServer = { id: 'server-1', authorization } as any;
      aiServerService.getAuthorizationPolicy.mockReturnValue(authorization);

      const result = resolver.authorization(aiServer);

      expect(aiServerService.getAuthorizationPolicy).toHaveBeenCalledWith(
        aiServer
      );
      expect(result).toEqual(authorization);
    });
  });

  describe('defaultAiPersona', () => {
    it('should delegate to aiServerService.getDefaultAiPersonaOrFail', async () => {
      const persona = { id: 'persona-default' };
      aiServerService.getDefaultAiPersonaOrFail.mockResolvedValue(persona);

      const result = await resolver.defaultAiPersona();

      expect(aiServerService.getDefaultAiPersonaOrFail).toHaveBeenCalledTimes(
        1
      );
      expect(result).toEqual(persona);
    });
  });

  describe('aiPersonas', () => {
    it('should delegate to aiServerService.getAiPersonas', async () => {
      const personas = [{ id: 'p1' }, { id: 'p2' }];
      aiServerService.getAiPersonas.mockResolvedValue(personas);

      const result = await resolver.aiPersonas();

      expect(aiServerService.getAiPersonas).toHaveBeenCalledTimes(1);
      expect(result).toEqual(personas);
    });
  });

  describe('aiPersona', () => {
    it('should delegate to aiServerService.getAiPersonaOrFail with ID', async () => {
      const persona = { id: 'p1' };
      aiServerService.getAiPersonaOrFail.mockResolvedValue(persona);

      const result = await resolver.aiPersona('p1');

      expect(aiServerService.getAiPersonaOrFail).toHaveBeenCalledWith('p1');
      expect(result).toEqual(persona);
    });
  });
});

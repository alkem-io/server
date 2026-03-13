import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AiPersonaResolverFields } from './ai.persona.resolver.fields';
import { AiPersonaService } from './ai.persona.service';

describe('AiPersonaResolverFields', () => {
  let resolver: AiPersonaResolverFields;
  let aiPersonaService: Record<string, Mock>;
  let authorizationService: Record<string, Mock>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiPersonaResolverFields],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AiPersonaResolverFields);
    aiPersonaService = module.get(AiPersonaService) as unknown as Record<
      string,
      Mock
    >;
    authorizationService = module.get(
      AuthorizationService
    ) as unknown as Record<string, Mock>;
  });

  describe('promptGraph', () => {
    const actorContext = { actorID: 'user-1' } as any;

    it('should return stored promptGraph when it exists', async () => {
      const storedGraph = { nodes: [{ id: 'n1' }], edges: [] };
      const persona = {
        id: 'p1',
        engine: AiPersonaEngine.EXPERT,
        authorization: { id: 'auth-1' },
        promptGraph: storedGraph,
      };
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);

      const result = await resolver.promptGraph(
        { id: 'p1' } as any,
        actorContext
      );

      expect(result).toEqual(storedGraph);
    });

    it('should return default graph for EXPERT engine when no stored graph', async () => {
      const persona = {
        id: 'p1',
        engine: AiPersonaEngine.EXPERT,
        authorization: { id: 'auth-1' },
        promptGraph: undefined,
      };
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);

      const result = await resolver.promptGraph(
        { id: 'p1' } as any,
        actorContext
      );

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it('should return null for non-EXPERT, non-LIBRA_FLOW engine without stored graph', async () => {
      const persona = {
        id: 'p1',
        engine: AiPersonaEngine.GUIDANCE,
        authorization: { id: 'auth-1' },
        promptGraph: undefined,
      };
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);

      const result = await resolver.promptGraph(
        { id: 'p1' } as any,
        actorContext
      );

      expect(result).toBeNull();
    });

    it('should check authorization before returning data', async () => {
      const authorization = { id: 'auth-1' };
      const persona = {
        id: 'p1',
        engine: AiPersonaEngine.GUIDANCE,
        authorization,
        promptGraph: undefined,
      };
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);

      await resolver.promptGraph({ id: 'p1' } as any, actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        authorization,
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('authorization', () => {
    const actorContext = { actorID: 'user-1' } as any;

    it('should return the authorization policy of the persona', async () => {
      const authorization = { id: 'auth-1' };
      const persona = {
        id: 'p1',
        authorization,
      };
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);

      const result = await resolver.authorization(
        { id: 'p1' } as any,
        actorContext
      );

      expect(result).toEqual(authorization);
    });
  });

  describe('externalConfig', () => {
    const actorContext = { actorID: 'user-1' } as any;

    it('should return externalConfig for GENERIC_OPENAI engine', async () => {
      const externalConfig = { apiKey: 'encrypted:key', assistantId: 'asst' };
      const persona = {
        id: 'p1',
        engine: AiPersonaEngine.GENERIC_OPENAI,
        authorization: { id: 'auth-1' },
        externalConfig,
      };
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);

      const result = await resolver.externalConfig(
        { id: 'p1' } as any,
        actorContext
      );

      expect(result).toEqual(externalConfig);
    });

    it('should return null for non-externally-configurable engine', async () => {
      const persona = {
        id: 'p1',
        engine: AiPersonaEngine.EXPERT,
        authorization: { id: 'auth-1' },
        externalConfig: { apiKey: 'key' },
      };
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);

      const result = await resolver.externalConfig(
        { id: 'p1' } as any,
        actorContext
      );

      expect(result).toBeNull();
    });

    it('should return externalConfig for LIBRA_FLOW engine', async () => {
      const externalConfig = { apiKey: 'encrypted:key' };
      const persona = {
        id: 'p1',
        engine: AiPersonaEngine.LIBRA_FLOW,
        authorization: { id: 'auth-1' },
        externalConfig,
      };
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue(persona);

      const result = await resolver.externalConfig(
        { id: 'p1' } as any,
        actorContext
      );

      expect(result).toEqual(externalConfig);
    });
  });
});

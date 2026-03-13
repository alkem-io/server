import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { VirtualContributorModelCardResolverFields } from './virtual.contributor.model.card.resolver.fields';

describe('VirtualContributorModelCardResolverFields', () => {
  let resolver: VirtualContributorModelCardResolverFields;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorModelCardResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<VirtualContributorModelCardResolverFields>(
      VirtualContributorModelCardResolverFields
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('myPrivileges (spaceUsage)', () => {
    it('should return space usage model card entries', () => {
      const result = resolver.myPrivileges();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(3);
    });
  });

  describe('aiEngine', () => {
    it('should return external=false for default engine', async () => {
      const modelCard = {
        aiPersona: {} as any,
        aiPersonaEngine: AiPersonaEngine.GUIDANCE,
      };

      const result = await resolver.aiEngine(modelCard);

      expect(result.isExternal).toBe(false);
      expect(result.hostingLocation).toBe('Sweden, EU');
    });

    it('should return external=true for GENERIC_OPENAI engine', async () => {
      const modelCard = {
        aiPersona: {} as any,
        aiPersonaEngine: AiPersonaEngine.GENERIC_OPENAI,
      };

      const result = await resolver.aiEngine(modelCard);

      expect(result.isExternal).toBe(true);
      expect(result.canAccessWebWhenAnswering).toBe(true);
      expect(result.hostingLocation).toBe('Unknown');
    });

    it('should return isUsingOpenWeightsModel=true for OPENAI_ASSISTANT', async () => {
      const modelCard = {
        aiPersona: {} as any,
        aiPersonaEngine: AiPersonaEngine.OPENAI_ASSISTANT,
      };

      const result = await resolver.aiEngine(modelCard);

      expect(result.isExternal).toBe(false);
      expect(result.isUsingOpenWeightsModel).toBe(true);
      expect(result.hostingLocation).toBe('Unknown');
    });
  });

  describe('monitoring', () => {
    it('should return monitoring information', async () => {
      const result = await resolver.monitoring();

      expect(result.isUsageMonitoredByAlkemio).toBe(true);
    });
  });
});

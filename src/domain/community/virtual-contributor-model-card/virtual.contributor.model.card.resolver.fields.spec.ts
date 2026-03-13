import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { VirtualContributorModelCardEntry } from '@common/enums/virtual.contributor.model.card.entry';
import { VirtualContributorModelCardResolverFields } from './virtual.contributor.model.card.resolver.fields';

describe('VirtualContributorModelCardResolverFields', () => {
  let resolver: VirtualContributorModelCardResolverFields;

  beforeEach(() => {
    resolver = new VirtualContributorModelCardResolverFields();
  });

  describe('myPrivileges (spaceUsage)', () => {
    it('should return three space usage entries', () => {
      const result = resolver.myPrivileges();

      expect(result).toHaveLength(3);
    });

    it('should include SPACE_CAPABILITIES entry with expected flags', () => {
      const result = resolver.myPrivileges();
      const capabilities = result.find(
        r =>
          r.modelCardEntry ===
          VirtualContributorModelCardEntry.SPACE_CAPABILITIES
      );

      expect(capabilities).toBeDefined();
      expect(capabilities!.flags).toHaveLength(3);
    });

    it('should include SPACE_DATA_ACCESS entry', () => {
      const result = resolver.myPrivileges();
      const dataAccess = result.find(
        r =>
          r.modelCardEntry ===
          VirtualContributorModelCardEntry.SPACE_DATA_ACCESS
      );

      expect(dataAccess).toBeDefined();
      expect(dataAccess!.flags).toHaveLength(3);
    });

    it('should include SPACE_ROLE_REQUIRED entry', () => {
      const result = resolver.myPrivileges();
      const roleRequired = result.find(
        r =>
          r.modelCardEntry ===
          VirtualContributorModelCardEntry.SPACE_ROLE_REQUIRED
      );

      expect(roleRequired).toBeDefined();
      expect(roleRequired!.flags).toHaveLength(2);
    });
  });

  describe('aiEngine', () => {
    it('should return external=true for LIBRA_FLOW engine', async () => {
      const modelCard = {
        aiPersonaEngine: AiPersonaEngine.LIBRA_FLOW,
      } as any;

      const result = await resolver.aiEngine(modelCard);

      expect(result.isExternal).toBe(true);
      expect(result.canAccessWebWhenAnswering).toBe(true);
      expect(result.hostingLocation).toBe('Unknown');
    });

    it('should return external=true for GENERIC_OPENAI engine', async () => {
      const modelCard = {
        aiPersonaEngine: AiPersonaEngine.GENERIC_OPENAI,
      } as any;

      const result = await resolver.aiEngine(modelCard);

      expect(result.isExternal).toBe(true);
      expect(result.areAnswersRestrictedToBodyOfKnowledge).toBe('No');
      expect(result.isUsingOpenWeightsModel).toBe(true);
      expect(result.additionalTechnicalDetails).toContain(
        'openai.com/docs/overview'
      );
    });

    it('should return external=false for OPENAI_ASSISTANT engine', async () => {
      const modelCard = {
        aiPersonaEngine: AiPersonaEngine.OPENAI_ASSISTANT,
      } as any;

      const result = await resolver.aiEngine(modelCard);

      expect(result.isExternal).toBe(false);
      expect(result.isUsingOpenWeightsModel).toBe(true);
      expect(result.areAnswersRestrictedToBodyOfKnowledge).toBe(
        'Yes, when provided'
      );
      expect(result.hostingLocation).toBe('Unknown');
      expect(result.additionalTechnicalDetails).toContain('assistants');
    });

    it('should return external=false for EXPERT engine (default case)', async () => {
      const modelCard = {
        aiPersonaEngine: AiPersonaEngine.EXPERT,
      } as any;

      const result = await resolver.aiEngine(modelCard);

      expect(result.isExternal).toBe(false);
      expect(result.isUsingOpenWeightsModel).toBe(false);
      expect(result.isInteractionDataUsedForTraining).toBe(false);
      expect(result.areAnswersRestrictedToBodyOfKnowledge).toBe('Yes');
      expect(result.canAccessWebWhenAnswering).toBe(false);
      expect(result.hostingLocation).toBe('Sweden, EU');
      expect(result.additionalTechnicalDetails).toContain('huggingface');
    });

    it('should return external=false for GUIDANCE engine', async () => {
      const modelCard = {
        aiPersonaEngine: AiPersonaEngine.GUIDANCE,
      } as any;

      const result = await resolver.aiEngine(modelCard);

      expect(result.isExternal).toBe(false);
      expect(result.canAccessWebWhenAnswering).toBe(false);
    });

    it('should set isInteractionDataUsedForTraining to null for external engines', async () => {
      const modelCard = {
        aiPersonaEngine: AiPersonaEngine.GENERIC_OPENAI,
      } as any;

      const result = await resolver.aiEngine(modelCard);

      expect(result.isInteractionDataUsedForTraining).toBeNull();
    });
  });

  describe('monitoring', () => {
    it('should return monitoring result with isUsageMonitoredByAlkemio=true', async () => {
      const result = await resolver.monitoring();

      expect(result.isUsageMonitoredByAlkemio).toBe(true);
    });
  });
});

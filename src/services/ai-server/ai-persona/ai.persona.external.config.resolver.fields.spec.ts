import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AiPersonaExternalConfigResolverFields } from './ai.persona.external.config.resolver.fields';
import { AiPersonaService } from './ai.persona.service';

describe('AiPersonaExternalConfigResolverFields', () => {
  let resolver: AiPersonaExternalConfigResolverFields;
  let aiPersonaService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiPersonaExternalConfigResolverFields],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AiPersonaExternalConfigResolverFields);
    aiPersonaService = module.get(AiPersonaService) as unknown as Record<
      string,
      Mock
    >;
  });

  describe('apiKey', () => {
    it('should delegate to aiPersonaService.getApiKeyID', async () => {
      const config = { apiKey: 'encrypted:sk-123456789abcde' };
      aiPersonaService.getApiKeyID.mockReturnValue('sk-1234...bcde');

      const result = await resolver.apiKey(config as any);

      expect(aiPersonaService.getApiKeyID).toHaveBeenCalledWith(config);
      expect(result).toBe('sk-1234...bcde');
    });

    it('should return empty string when no apiKey is set', async () => {
      const config = {};
      aiPersonaService.getApiKeyID.mockReturnValue('');

      const result = await resolver.apiKey(config as any);

      expect(result).toBe('');
    });
  });
});

import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { Test, TestingModule } from '@nestjs/testing';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { AiServerAdapter } from './ai.server.adapter';

describe('AiServerAdapter', () => {
  let adapter: AiServerAdapter;
  let aiServerService: AiServerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiServerAdapter],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get<AiServerAdapter>(AiServerAdapter);
    aiServerService = module.get<AiServerService>(AiServerService);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('refreshBodyOfKnowledge', () => {
    it('should delegate to aiServerService.ingestBodyOfKnowledge', async () => {
      vi.mocked(aiServerService.ingestBodyOfKnowledge).mockResolvedValue(true);

      const result = await adapter.refreshBodyOfKnowledge(
        'bok-id',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        'persona-id'
      );

      expect(result).toBe(true);
      expect(aiServerService.ingestBodyOfKnowledge).toHaveBeenCalledWith(
        'bok-id',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        'persona-id'
      );
    });
  });

  describe('ensureContextIsLoaded', () => {
    it('should delegate to aiServerService.ensureContextIsIngested', async () => {
      vi.mocked(aiServerService.ensureContextIsIngested).mockResolvedValue(
        undefined
      );

      await adapter.ensureContextIsLoaded('space-id');

      expect(aiServerService.ensureContextIsIngested).toHaveBeenCalledWith(
        'space-id'
      );
    });
  });

  describe('getPersonaEngine', () => {
    it('should return the engine from the persona', async () => {
      vi.mocked(aiServerService.getAiPersonaOrFail).mockResolvedValue({
        engine: 'COMMUNITY_MANAGER' as any,
      } as any);

      const result = await adapter.getPersonaEngine('persona-id');

      expect(result).toBe('COMMUNITY_MANAGER');
      expect(aiServerService.getAiPersonaOrFail).toHaveBeenCalledWith(
        'persona-id'
      );
    });
  });

  describe('getPersonaOrFail', () => {
    it('should delegate to aiServerService.getAiPersonaOrFail', async () => {
      const mockPersona = { id: 'persona-id' } as any;
      vi.mocked(aiServerService.getAiPersonaOrFail).mockResolvedValue(
        mockPersona
      );

      const result = await adapter.getPersonaOrFail('persona-id');

      expect(result).toBe(mockPersona);
    });
  });

  describe('createAPersona', () => {
    it('should delegate to aiServerService.createAiPersona', async () => {
      const input = { description: 'test' } as any;
      const mockResult = { id: 'new-persona' } as any;
      vi.mocked(aiServerService.createAiPersona).mockResolvedValue(mockResult);

      const result = await adapter.createAPersona(input);

      expect(result).toBe(mockResult);
      expect(aiServerService.createAiPersona).toHaveBeenCalledWith(input);
    });
  });

  describe('updateAiPersona', () => {
    it('should delegate to aiServerService.updateAiPersona', async () => {
      const input = { ID: 'persona-id' } as any;
      vi.mocked(aiServerService.updateAiPersona).mockResolvedValue({} as any);

      await adapter.updateAiPersona(input);

      expect(aiServerService.updateAiPersona).toHaveBeenCalledWith(input);
    });
  });

  describe('applyAuthorizationOnAiPersona', () => {
    it('should delegate to aiServerService.resetAuthorizationPolicyOnAiPersona', async () => {
      const mockPolicies = [{ id: 'policy-1' }] as any;
      vi.mocked(
        aiServerService.resetAuthorizationPolicyOnAiPersona
      ).mockResolvedValue(mockPolicies);

      const result = await adapter.applyAuthorizationOnAiPersona('persona-id', {
        id: 'parent-auth',
      } as any);

      expect(result).toBe(mockPolicies);
      expect(
        aiServerService.resetAuthorizationPolicyOnAiPersona
      ).toHaveBeenCalledWith('persona-id', { id: 'parent-auth' });
    });
  });

  describe('getAiServer', () => {
    it('should delegate to aiServerService.getAiServerOrFail', async () => {
      const mockServer = { id: 'server-id' } as any;
      vi.mocked(aiServerService.getAiServerOrFail).mockResolvedValue(
        mockServer
      );

      const result = await adapter.getAiServer();

      expect(result).toBe(mockServer);
    });
  });

  describe('invoke', () => {
    it('should delegate to aiServerService.invoke with externalMetadata', async () => {
      vi.mocked(aiServerService.invoke).mockResolvedValue(undefined);

      const input = {
        personaServiceID: 'service-id',
        message: 'hello',
        externalMetadata: { key: 'value' },
      } as any;

      await adapter.invoke(input);

      expect(aiServerService.invoke).toHaveBeenCalledWith({
        ...input,
        externalMetadata: { key: 'value' },
      });
    });

    it('should default externalMetadata to empty object when not provided', async () => {
      vi.mocked(aiServerService.invoke).mockResolvedValue(undefined);

      const input = {
        personaServiceID: 'service-id',
        message: 'hello',
      } as any;

      await adapter.invoke(input);

      expect(aiServerService.invoke).toHaveBeenCalledWith({
        ...input,
        externalMetadata: {},
      });
    });
  });
});

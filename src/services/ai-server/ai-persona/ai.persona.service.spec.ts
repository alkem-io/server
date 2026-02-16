import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EncryptionService } from '@hedger/nestjs-encryption';
import { Test, TestingModule } from '@nestjs/testing';
import { AiPersonaEngineAdapter } from '@services/ai-server/ai-persona-engine-adapter/ai.persona.engine.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AiPersona } from './ai.persona.entity';
import { AiPersonaService } from './ai.persona.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('AiPersonaService', () => {
  let service: AiPersonaService;
  let db: any;
  let authorizationPolicyService: Record<string, Mock>;
  let aiPersonaEngineAdapter: Record<string, Mock>;
  let encryptionService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiPersonaService,
        mockDrizzleProvider,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === EncryptionService) {
          return {
            encrypt: vi.fn((val: string) => `encrypted:${val}`),
            decrypt: vi.fn((val: string) =>
              val.startsWith('encrypted:') ? val.slice(10) : val
            ),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(AiPersonaService);
    db = module.get(DRIZZLE);
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as unknown as Record<string, Mock>;
    aiPersonaEngineAdapter = module.get(
      AiPersonaEngineAdapter
    ) as unknown as Record<string, Mock>;
    encryptionService = module.get(EncryptionService) as unknown as Record<
      string,
      Mock
    >;
  });

  describe('createAiPersona', () => {
    it('should create an AI persona with engine, prompt, and encrypted external config', async () => {
      const input = {
        engine: AiPersonaEngine.EXPERT,
        prompt: ['test prompt'],
        externalConfig: { apiKey: 'sk-123', assistantId: 'asst-abc' },
      };
      const aiServer = { id: 'server-1' } as any;
      const savedPersona = { id: 'persona-1', ...input };

      db.returning.mockResolvedValueOnce([savedPersona]);

      const result = await service.createAiPersona(input, aiServer);

      expect(result).toEqual(expect.objectContaining({ id: 'persona-1' }));
    });

    it('should set authorization policy with AI_PERSONA type', async () => {
      const input = {
        engine: AiPersonaEngine.GUIDANCE,
        prompt: [],
        externalConfig: undefined,
      };
      const aiServer = { id: 'server-1' } as any;

      db.returning.mockResolvedValueOnce([{ id: 'persona-1' }]);

      const result = await service.createAiPersona(input, aiServer);

      expect(result.authorization).toBeDefined();
      expect(result.authorization!.type).toEqual(
        AuthorizationPolicyType.AI_PERSONA
      );
    });

    it('should encrypt apiKey and assistantId in external config', async () => {
      const input = {
        engine: AiPersonaEngine.EXPERT,
        prompt: [],
        externalConfig: { apiKey: 'key123', assistantId: 'asst456' },
      };
      const aiServer = { id: 'server-1' } as any;

      db.returning.mockResolvedValueOnce([{ id: 'persona-1' }]);

      await service.createAiPersona(input, aiServer);

      expect(encryptionService.encrypt).toHaveBeenCalledWith('key123');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('asst456');
    });

    it('should handle undefined external config gracefully', async () => {
      const input = {
        engine: AiPersonaEngine.EXPERT,
        prompt: [],
        externalConfig: undefined,
      };
      const aiServer = { id: 'server-1' } as any;

      db.returning.mockResolvedValueOnce([{ id: 'persona-1', externalConfig: {} }]);

      const result = await service.createAiPersona(input, aiServer);

      expect(result.externalConfig).toEqual({});
    });
  });

  describe('updateAiPersona', () => {
    const existingPersona = {
      id: 'persona-1',
      engine: AiPersonaEngine.EXPERT,
      prompt: ['old prompt'],
      externalConfig: { apiKey: 'encrypted:oldKey' },
      promptGraph: undefined,
    };

    beforeEach(() => {
      db.query.aiPersonas.findFirst.mockResolvedValue({ ...existingPersona });
    });

    it('should update prompt when provided', async () => {
      const updateInput = { ID: 'persona-1', prompt: ['new prompt'] };

      await service.updateAiPersona(updateInput);

    });

    it('should update engine when provided', async () => {
      const updateInput = {
        ID: 'persona-1',
        engine: AiPersonaEngine.GUIDANCE,
      };

      await service.updateAiPersona(updateInput);

    });

    it('should not change prompt when not provided', async () => {
      const updateInput = {
        ID: 'persona-1',
        engine: AiPersonaEngine.GUIDANCE,
      };

      await service.updateAiPersona(updateInput);

    });

    it('should merge external config with existing decrypted config', async () => {
      const updateInput = {
        ID: 'persona-1',
        externalConfig: { assistantId: 'newAsst' },
      };

      await service.updateAiPersona(updateInput);

      // The decrypt of 'encrypted:oldKey' yields 'oldKey'
      // Then the merged config is { apiKey: 'oldKey', assistantId: 'newAsst' }
      // which gets re-encrypted
      expect(encryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted:oldKey'
      );
      expect(encryptionService.encrypt).toHaveBeenCalledWith('oldKey');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('newAsst');
    });

    it('should update promptGraph nodes when provided', async () => {
      const updateInput = {
        ID: 'persona-1',
        promptGraph: { nodes: [{ id: 'n1' }] },
      } as any;

      await service.updateAiPersona(updateInput);

    });

    it('should update promptGraph edges when provided', async () => {
      const updateInput = {
        ID: 'persona-1',
        promptGraph: { edges: [{ from: 'a', to: 'b' }] },
      } as any;

      await service.updateAiPersona(updateInput);

    });

    it('should throw EntityNotFoundException when persona does not exist', async () => {
      db.query.aiPersonas.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAiPersona({ ID: 'nonexistent' })
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return the re-fetched persona after save', async () => {
      const updatedPersona = { id: 'persona-1', prompt: ['updated'] };

      // First call returns existing persona, second call (after save) returns updated
      db.query.aiPersonas.findFirst
        .mockResolvedValueOnce({ ...existingPersona })
        .mockResolvedValueOnce(updatedPersona);

      const result = await service.updateAiPersona({
        ID: 'persona-1',
        prompt: ['updated'],
      });

      expect(result).toEqual(updatedPersona);
    });
  });

  describe('deleteAiPersona', () => {
    it('should delete authorization and remove persona', async () => {
      const authorization = { id: 'auth-1' };
      const persona = {
        id: 'persona-1',
        authorization,
      };
      db.query.aiPersonas.findFirst.mockResolvedValue(persona);

      const result = await service.deleteAiPersona({ ID: 'persona-1' });

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        authorization
      );

      expect(result.id).toEqual('persona-1');
    });

    it('should throw EntityNotFoundException when persona has no authorization', async () => {
      const persona = {
        id: 'persona-1',
        authorization: undefined,
      };
      db.query.aiPersonas.findFirst.mockResolvedValue(persona);

      await expect(
        service.deleteAiPersona({ ID: 'persona-1' })
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when persona does not exist', async () => {
      db.query.aiPersonas.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteAiPersona({ ID: 'nonexistent' })
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getAiPersonaOrFail', () => {
    it('should return persona when found', async () => {
      const persona = { id: 'persona-1', engine: AiPersonaEngine.EXPERT };
      db.query.aiPersonas.findFirst.mockResolvedValue(persona);

      const result = await service.getAiPersonaOrFail('persona-1');

      expect(result).toEqual(persona);
    });

    it('should throw EntityNotFoundException when persona not found', async () => {
      db.query.aiPersonas.findFirst.mockResolvedValue(null);

      await expect(service.getAiPersonaOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });

  });

  describe('getAiPersona', () => {
    it('should return null when persona not found', async () => {
      db.query.aiPersonas.findFirst.mockResolvedValue(null);

      const result = await service.getAiPersona('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('invoke', () => {
    it('should invoke engine adapter with correct input for non-EXPERT engine', async () => {
      const persona = {
        id: 'persona-1',
        engine: AiPersonaEngine.GUIDANCE,
        prompt: ['test'],
        externalConfig: {},
      };
      db.query.aiPersonas.findFirst.mockResolvedValue(persona);
      aiPersonaEngineAdapter.invoke.mockResolvedValue(undefined);

      const invocationInput = {
        aiPersonaID: 'persona-1',
        operation: 'query',
        message: 'Hello',
        userID: 'user-1',
        contextID: 'ctx-1',
        displayName: 'Test VC',
        description: 'A test VC',
        externalMetadata: {},
        resultHandler: { action: 'none', roomDetails: undefined },
      } as any;

      await service.invoke(invocationInput, []);

      expect(aiPersonaEngineAdapter.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          engine: AiPersonaEngine.GUIDANCE,
          message: 'Hello',
          prompt: ['test'],
          userID: 'user-1',
        })
      );
    });

    it('should use stored promptGraph for EXPERT engine when available', async () => {
      const storedGraph = {
        nodes: [{ id: 'n1', prompt: 'hello' }],
        edges: [],
        start: 'n1',
        end: 'n1',
      };
      const persona = {
        id: 'persona-1',
        engine: AiPersonaEngine.EXPERT,
        prompt: ['test'],
        externalConfig: {},
        promptGraph: storedGraph,
      };
      db.query.aiPersonas.findFirst.mockResolvedValue(persona);
      aiPersonaEngineAdapter.invoke.mockResolvedValue(undefined);

      const invocationInput = {
        aiPersonaID: 'persona-1',
        message: 'Hello',
        displayName: 'VC',
        externalMetadata: {},
        resultHandler: { action: 'none' },
      } as any;

      await service.invoke(invocationInput, []);

      expect(aiPersonaEngineAdapter.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          promptGraph: storedGraph,
        })
      );
    });

    it('should use default graph from JSON when EXPERT engine has no stored promptGraph', async () => {
      const persona = {
        id: 'persona-1',
        engine: AiPersonaEngine.EXPERT,
        prompt: ['test'],
        externalConfig: {},
        promptGraph: undefined,
      };
      db.query.aiPersonas.findFirst.mockResolvedValue(persona);
      aiPersonaEngineAdapter.invoke.mockResolvedValue(undefined);

      const invocationInput = {
        aiPersonaID: 'persona-1',
        message: 'Hello',
        displayName: 'VC',
        externalMetadata: {},
        resultHandler: { action: 'none' },
      } as any;

      await service.invoke(invocationInput, []);

      expect(aiPersonaEngineAdapter.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          promptGraph: expect.any(Object),
        })
      );
    });

    it('should skip default promptGraph when invocationInput.promptGraph is provided', async () => {
      const persona = {
        id: 'persona-1',
        engine: AiPersonaEngine.EXPERT,
        prompt: ['test'],
        externalConfig: {},
        promptGraph: undefined,
      };
      db.query.aiPersonas.findFirst.mockResolvedValue(persona);
      aiPersonaEngineAdapter.invoke.mockResolvedValue(undefined);

      const customGraph = { nodes: [], edges: [], start: 's', end: 'e' };
      const invocationInput = {
        aiPersonaID: 'persona-1',
        message: 'Hello',
        displayName: 'VC',
        externalMetadata: {},
        resultHandler: { action: 'none' },
        promptGraph: customGraph,
      } as any;

      await service.invoke(invocationInput, []);

      // When promptGraph is present on invocationInput, the default graph assignment is skipped
      expect(aiPersonaEngineAdapter.invoke).toHaveBeenCalledWith(
        expect.not.objectContaining({
          promptGraph: expect.any(Object),
        })
      );
    });

    it('should decrypt external config for the engine input', async () => {
      const persona = {
        id: 'persona-1',
        engine: AiPersonaEngine.GENERIC_OPENAI,
        prompt: ['test'],
        externalConfig: {
          apiKey: 'encrypted:mykey',
          assistantId: 'encrypted:myasst',
        },
      };
      db.query.aiPersonas.findFirst.mockResolvedValue(persona);
      aiPersonaEngineAdapter.invoke.mockResolvedValue(undefined);

      const invocationInput = {
        aiPersonaID: 'persona-1',
        message: 'Hello',
        displayName: 'VC',
        externalMetadata: {},
        resultHandler: { action: 'none' },
      } as any;

      await service.invoke(invocationInput, []);

      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted:mykey');
      expect(encryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted:myasst'
      );
    });
  });

  describe('getAssistantID', () => {
    it('should return decrypted assistant ID', () => {
      const config = { assistantId: 'encrypted:asst-xyz' };
      const result = service.getAssistantID(config);
      expect(result).toBe('asst-xyz');
    });

    it('should return empty string when assistantId is not set', () => {
      const config = {};
      const result = service.getAssistantID(config);
      expect(result).toBe('');
    });
  });

  describe('getApiKeyID', () => {
    it('should return masked API key with first 7 and last 4 chars', () => {
      const config = { apiKey: 'encrypted:sk-1234567890abcd' };
      const result = service.getApiKeyID(config);
      // Decrypted is 'sk-1234567890abcd'
      expect(result).toBe('sk-1234...abcd');
    });

    it('should return empty string when apiKey is not set', () => {
      const config = {};
      const result = service.getApiKeyID(config);
      expect(result).toBe('');
    });
  });
});

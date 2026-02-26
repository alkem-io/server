import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiPersonaService } from '@services/ai-server/ai-persona/ai.persona.service';
import { InvocationResultAction } from '@services/ai-server/ai-persona/dto/ai.persona.invocation/invocation.result.action.dto';
import { MessageSenderRole } from '@services/ai-server/ai-persona/dto/interaction.message';
import {
  InvokeEngineResponse,
  InvokeEngineResult,
} from '@services/infrastructure/event-bus/messages/invoke.engine.result';
import { RoomControllerService } from '@services/room-integration/room.controller.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock, vi } from 'vitest';
import { AiServer } from './ai.server.entity';
import { AiServerService } from './ai.server.service';

describe('AiServerService', () => {
  let service: AiServerService;
  let aiServerRepository: Record<string, Mock>;
  let vcRepository: Record<string, Mock>;
  let aiPersonaService: Record<string, Mock>;
  let roomControllerService: Record<string, Mock>;
  let subscriptionPublishService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiServerService,
        repositoryProviderMockFactory(AiServer),
        repositoryProviderMockFactory(VirtualContributor),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AiServerService);
    aiServerRepository = module.get(getRepositoryToken(AiServer));
    vcRepository = module.get(getRepositoryToken(VirtualContributor));
    aiPersonaService = module.get(AiPersonaService) as unknown as Record<
      string,
      Mock
    >;
    roomControllerService = module.get(
      RoomControllerService
    ) as unknown as Record<string, Mock>;
    subscriptionPublishService = module.get(
      SubscriptionPublishService
    ) as unknown as Record<string, Mock>;
  });

  describe('getAiServerOrFail', () => {
    it('should return the AI server when one exists', async () => {
      const aiServer = { id: 'server-1', authorization: { id: 'auth-1' } };
      aiServerRepository.findOne.mockResolvedValue(aiServer);

      const result = await service.getAiServerOrFail();

      expect(result).toEqual(aiServer);
    });

    it('should throw EntityNotFoundException when no AI server exists', async () => {
      aiServerRepository.findOne.mockResolvedValue(null);

      await expect(service.getAiServerOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getAuthorizationPolicy', () => {
    it('should return authorization policy when it exists on the AI server', () => {
      const authorization = { id: 'auth-1' };
      const aiServer = { id: 'server-1', authorization } as any;

      const result = service.getAuthorizationPolicy(aiServer);

      expect(result).toEqual(authorization);
    });

    it('should throw EntityNotFoundException when authorization is missing', () => {
      const aiServer = { id: 'server-1', authorization: undefined } as any;

      expect(() => service.getAuthorizationPolicy(aiServer)).toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getAiPersonas', () => {
    it('should return AI personas when they exist on the server', async () => {
      const personas = [{ id: 'persona-1' }, { id: 'persona-2' }];
      const aiServer = { id: 'server-1', aiPersonas: personas };
      aiServerRepository.findOne.mockResolvedValue(aiServer);

      const result = await service.getAiPersonas();

      expect(result).toEqual(personas);
    });

    it('should throw EntityNotFoundException when AI personas are undefined', async () => {
      const aiServer = { id: 'server-1', aiPersonas: undefined };
      aiServerRepository.findOne.mockResolvedValue(aiServer);

      await expect(service.getAiPersonas()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getDefaultAiPersonaOrFail', () => {
    it('should return default AI persona when it exists', async () => {
      const defaultPersona = { id: 'persona-default' };
      const aiServer = {
        id: 'server-1',
        defaultAiPersona: defaultPersona,
      };
      aiServerRepository.findOne.mockResolvedValue(aiServer);

      const result = await service.getDefaultAiPersonaOrFail();

      expect(result).toEqual(defaultPersona);
    });

    it('should throw EntityNotFoundException when no default persona exists', async () => {
      const aiServer = { id: 'server-1', defaultAiPersona: undefined };
      aiServerRepository.findOne.mockResolvedValue(aiServer);

      await expect(service.getDefaultAiPersonaOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updatePersonaBoKLastUpdated', () => {
    it('should publish subscription event when virtual contributor is found', async () => {
      const persona: any = { id: 'persona-1' };
      const vc = { id: 'vc-1', aiPersonaID: 'persona-1' };
      vi.mocked(aiPersonaService.getAiPersonaOrFail).mockResolvedValue(persona);
      vi.mocked(aiPersonaService.save).mockResolvedValue(persona);
      vcRepository.findOne.mockResolvedValue(vc);

      const now = new Date();
      await service.updatePersonaBoKLastUpdated('persona-1', now);

      expect(persona.bodyOfKnowledgeLastUpdated).toBe(now);
      expect(
        subscriptionPublishService.publishVirtualContributorUpdated
      ).toHaveBeenCalledWith(vc);
    });

    it('should not publish subscription event when virtual contributor is not found', async () => {
      const persona = { id: 'persona-1' };
      vi.mocked(aiPersonaService.getAiPersonaOrFail).mockResolvedValue(persona);
      vi.mocked(aiPersonaService.save).mockResolvedValue(persona);
      vcRepository.findOne.mockResolvedValue(null);

      await service.updatePersonaBoKLastUpdated('persona-1', null);

      expect(
        subscriptionPublishService.publishVirtualContributorUpdated
      ).not.toHaveBeenCalled();
    });
  });

  describe('ingestBodyOfKnowledge', () => {
    it('should publish IngestWebsite events for GUIDANCE engine', async () => {
      const persona = {
        id: 'persona-1',
        engine: AiPersonaEngine.GUIDANCE,
      };
      vi.mocked(aiPersonaService.getAiPersonaOrFail).mockResolvedValue(
        persona as any
      );

      const result = await service.ingestBodyOfKnowledge(
        'bok-1',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        'persona-1'
      );

      expect(result).toBe(true);
    });

    it('should publish IngestBodyOfKnowledge event for non-GUIDANCE engine', async () => {
      const persona = {
        id: 'persona-1',
        engine: AiPersonaEngine.EXPERT,
      };
      vi.mocked(aiPersonaService.getAiPersonaOrFail).mockResolvedValue(
        persona as any
      );

      const result = await service.ingestBodyOfKnowledge(
        'bok-1',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        'persona-1'
      );

      expect(result).toBe(true);
    });
  });

  describe('handleInvokeEngineResult', () => {
    it('should call postReply handler when action is POST_REPLY and input is valid', async () => {
      const event = {
        original: {
          resultHandler: {
            action: InvocationResultAction.POST_REPLY,
            roomDetails: { roomID: 'room-1', actorID: 'actor-1' },
          },
        },
        response: new InvokeEngineResponse({ message: 'test' }),
      } as InvokeEngineResult;

      await service.handleInvokeEngineResult(event);

      expect(roomControllerService.postReply).toHaveBeenCalledWith(event);
    });

    it('should call postMessage handler when action is POST_MESSAGE', async () => {
      const event = {
        original: {
          resultHandler: {
            action: InvocationResultAction.POST_MESSAGE,
            roomDetails: { roomID: 'room-1', actorID: 'actor-1' },
          },
        },
        response: new InvokeEngineResponse({ message: 'test' }),
      } as InvokeEngineResult;

      await service.handleInvokeEngineResult(event);

      expect(roomControllerService.postMessage).toHaveBeenCalledWith(event);
    });

    it('should not call any handler when action is NONE', async () => {
      const event = {
        original: {
          resultHandler: {
            action: InvocationResultAction.NONE,
          },
        },
        response: new InvokeEngineResponse({ message: 'test' }),
      } as InvokeEngineResult;

      await service.handleInvokeEngineResult(event);

      expect(roomControllerService.postReply).not.toHaveBeenCalled();
      expect(roomControllerService.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('getLastNInteractionMessages', () => {
    it('should use thread messages when threadID is provided', async () => {
      const roomMessages = [
        { sender: '@user1', message: 'hello' },
        { sender: '@virtualcontributor-vc1', message: 'hi there' },
      ];
      vi.mocked(roomControllerService.getMessagesInThread).mockResolvedValue(
        roomMessages as any
      );

      const result = await service.getLastNInteractionMessages(
        { roomID: 'room-1', threadID: 'thread-1', actorID: 'actor-1' },
        100
      );

      expect(roomControllerService.getMessagesInThread).toHaveBeenCalledWith(
        'room-1',
        'thread-1'
      );
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe(MessageSenderRole.HUMAN);
      expect(result[1].role).toBe(MessageSenderRole.ASSISTANT);
    });

    it('should use room messages when threadID is not provided', async () => {
      const roomMessages = [{ sender: '@user1', message: 'hello' }];
      vi.mocked(roomControllerService.getMessages).mockResolvedValue(
        roomMessages as any
      );

      const result = await service.getLastNInteractionMessages(
        { roomID: 'room-1', actorID: 'actor-1' },
        100
      );

      expect(roomControllerService.getMessages).toHaveBeenCalledWith('room-1');
      expect(result).toHaveLength(1);
    });

    it('should limit messages to the specified count', async () => {
      const roomMessages = Array.from({ length: 10 }, (_, i) => ({
        sender: `@user${i}`,
        message: `msg ${i}`,
      }));
      vi.mocked(roomControllerService.getMessages).mockResolvedValue(
        roomMessages as any
      );

      const result = await service.getLastNInteractionMessages(
        { roomID: 'room-1', actorID: 'actor-1' },
        3,
        false
      );

      expect(result).toHaveLength(3);
    });

    it('should assign ASSISTANT role to virtualcontributor messages', async () => {
      const roomMessages = [
        { sender: '@virtualcontributor-vc1', message: 'reply' },
        { sender: '@humanuser', message: 'question' },
      ];
      vi.mocked(roomControllerService.getMessages).mockResolvedValue(
        roomMessages as any
      );

      const result = await service.getLastNInteractionMessages(
        { roomID: 'room-1', actorID: 'actor-1' },
        100
      );

      expect(result[0].role).toBe(MessageSenderRole.ASSISTANT);
      expect(result[1].role).toBe(MessageSenderRole.HUMAN);
    });
  });
});

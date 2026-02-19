import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  InvocationResultAction,
  VirtualContributorInvocationInput,
} from '@domain/community/virtual-contributor/dto/virtual.contributor.dto.invocation.input';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { IRoom } from '../room/room.interface';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { VirtualContributorMessageService } from './virtual.contributor.message.service';

describe('VirtualContributorMessageService', () => {
  let service: VirtualContributorMessageService;
  let roomLookupService: Mocked<RoomLookupService>;
  let virtualActorLookupService: Mocked<VirtualActorLookupService>;
  let aiServerAdapter: Mocked<AiServerAdapter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VirtualContributorMessageService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VirtualContributorMessageService);
    roomLookupService = module.get(RoomLookupService);
    virtualActorLookupService = module.get(VirtualActorLookupService);
    aiServerAdapter = module.get(AiServerAdapter);
  });

  describe('invokeVirtualContributor', () => {
    const mockRoom = { id: 'room-1' } as unknown as IRoom;
    const mockActorContext = { actorID: 'user-1' } as ActorContext;

    it('should resolve VC by agent ID and call invoke with correct input', async () => {
      const mockVC = {
        id: 'vc-entity-1',
        aiPersonaID: 'ai-persona-1',
        profile: {
          displayName: 'Test VC',
          description: 'A test VC',
        },
        agent: { id: 'vc-agent-1' },
        bodyOfKnowledgeID: 'bok-1',
      } as any;

      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        mockVC
      );

      // Mock the full invoke chain
      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        mockVC
      );
      roomLookupService.getRoomOrFail.mockResolvedValue({
        id: 'room-1',
        vcInteractionsByThread: {
          'thread-1': { virtualContributorActorID: 'vc-agent-1' },
        },
      } as any);
      aiServerAdapter.invoke.mockResolvedValue(undefined as any);

      await service.invokeVirtualContributor(
        'vc-agent-1',
        'Hello VC',
        'thread-1',
        mockActorContext,
        'space-1',
        mockRoom
      );

      expect(
        virtualActorLookupService.getVirtualContributorByIdOrFail
      ).toHaveBeenCalledWith('vc-agent-1');
    });

    it('should throw EntityNotInitializedException when VC has no aiPersonaID', async () => {
      const mockVC = {
        id: 'vc-entity-1',
        aiPersonaID: undefined,
        profile: { displayName: 'Test VC', description: '' },
        agent: { id: 'vc-agent-1' },
      } as any;

      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        mockVC
      );

      await expect(
        service.invokeVirtualContributor(
          'vc-agent-1',
          'Hello',
          'thread-1',
          mockActorContext,
          'space-1',
          mockRoom
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('invoke', () => {
    it('should invoke AI server adapter with correct input for POST_REPLY action', async () => {
      const mockVC = {
        id: 'vc-entity-1',
        agent: { id: 'vc-agent-1' },
        profile: { displayName: 'Test VC', description: 'A test VC' },
        authorization: {},
        bodyOfKnowledgeID: 'bok-1',
        aiPersonaID: 'ai-persona-1',
      } as any;

      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        mockVC
      );

      // Room with existing thread metadata
      roomLookupService.getRoomOrFail.mockResolvedValue({
        id: 'room-1',
        vcInteractionsByThread: {
          'thread-1': {
            virtualContributorActorID: 'vc-agent-1',
            externalThreadId: 'ext-thread-123',
          },
        },
      } as any);

      aiServerAdapter.invoke.mockResolvedValue(undefined as any);

      const input: VirtualContributorInvocationInput = {
        virtualContributorID: 'vc-entity-1',
        message: 'What is this?',
        contextSpaceID: 'space-1',
        userID: 'user-1',
        resultHandler: {
          action: InvocationResultAction.POST_REPLY,
          roomDetails: {
            roomID: 'room-1',
            threadID: 'thread-1',
            actorID: 'vc-agent-1',
          },
        },
      };

      await service.invoke(input);

      expect(aiServerAdapter.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyOfKnowledgeID: 'bok-1',
          aiPersonaID: 'ai-persona-1',
          message: 'What is this?',
          contextID: 'space-1',
          userID: 'user-1',
          description: 'A test VC',
          displayName: 'Test VC',
          externalMetadata: {
            threadId: 'ext-thread-123',
          },
        })
      );
    });

    it('should invoke without externalMetadata when no VC data for thread', async () => {
      const mockVC = {
        id: 'vc-entity-1',
        agent: { id: 'vc-agent-1' },
        profile: { displayName: 'Test VC', description: 'A test VC' },
        authorization: {},
        bodyOfKnowledgeID: 'bok-1',
        aiPersonaID: 'ai-persona-1',
      } as any;

      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        mockVC
      );

      roomLookupService.getRoomOrFail.mockResolvedValue({
        id: 'room-1',
        vcInteractionsByThread: {},
      } as any);

      aiServerAdapter.invoke.mockResolvedValue(undefined as any);

      const input: VirtualContributorInvocationInput = {
        virtualContributorID: 'vc-entity-1',
        message: 'Hello',
        contextSpaceID: 'space-1',
        userID: 'user-1',
        resultHandler: {
          action: InvocationResultAction.POST_REPLY,
          roomDetails: {
            roomID: 'room-1',
            threadID: 'thread-1',
            actorID: 'vc-agent-1',
          },
        },
      };

      await service.invoke(input);

      expect(aiServerAdapter.invoke).toHaveBeenCalledWith(
        expect.not.objectContaining({
          externalMetadata: expect.anything(),
        })
      );
    });

    it('should not attempt to load room for NONE action', async () => {
      const mockVC = {
        id: 'vc-entity-1',
        agent: { id: 'vc-agent-1' },
        profile: { displayName: 'Test VC', description: 'A test VC' },
        authorization: {},
        bodyOfKnowledgeID: 'bok-1',
        aiPersonaID: 'ai-persona-1',
      } as any;

      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        mockVC
      );

      aiServerAdapter.invoke.mockResolvedValue(undefined as any);

      const input: VirtualContributorInvocationInput = {
        virtualContributorID: 'vc-entity-1',
        message: 'Hello',
        contextSpaceID: 'space-1',
        userID: 'user-1',
        resultHandler: {
          action: InvocationResultAction.NONE,
        },
      };

      await service.invoke(input);

      expect(roomLookupService.getRoomOrFail).not.toHaveBeenCalled();
    });

    it('should not set externalMetadata when POST_REPLY but roomDetails is missing', async () => {
      const mockVC = {
        id: 'vc-entity-1',
        agent: { id: 'vc-agent-1' },
        profile: { displayName: 'Test VC', description: 'A test VC' },
        authorization: {},
        bodyOfKnowledgeID: 'bok-1',
        aiPersonaID: 'ai-persona-1',
      } as any;

      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        mockVC
      );

      aiServerAdapter.invoke.mockResolvedValue(undefined as any);

      const input: VirtualContributorInvocationInput = {
        virtualContributorID: 'vc-entity-1',
        message: 'Hello',
        contextSpaceID: 'space-1',
        userID: 'user-1',
        resultHandler: {
          action: InvocationResultAction.POST_REPLY,
          // roomDetails intentionally not set
        },
      };

      await service.invoke(input);

      // isInputValidForAction returns false when roomDetails is missing
      expect(roomLookupService.getRoomOrFail).not.toHaveBeenCalled();
    });

    it('should pass resultHandler through to AI server adapter input', async () => {
      const mockVC = {
        id: 'vc-entity-1',
        agent: { id: 'vc-agent-1' },
        profile: { displayName: 'Test VC', description: '' },
        authorization: {},
        bodyOfKnowledgeID: 'bok-1',
        aiPersonaID: 'ai-persona-1',
      } as any;

      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        mockVC
      );

      aiServerAdapter.invoke.mockResolvedValue(undefined as any);

      const resultHandler = {
        action: InvocationResultAction.NONE,
      };

      const input: VirtualContributorInvocationInput = {
        virtualContributorID: 'vc-entity-1',
        message: 'Hello',
        contextSpaceID: undefined,
        userID: undefined,
        resultHandler,
      };

      await service.invoke(input);

      expect(aiServerAdapter.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          resultHandler,
        })
      );
    });
  });
});

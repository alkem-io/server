import { ActorContextService } from '@core/actor-context/actor.context.service';
import { Actor } from '@domain/actor/actor/actor.entity';
import { MentionedEntityType } from '@domain/communication/messaging/mention.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { VirtualContributorMessageService } from '@domain/communication/virtual.contributor.message/virtual.contributor.message.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { type Mocked } from 'vitest';
import { MessageNotificationService } from './message.notification.service';
import {
  MessagePayload,
  VcInteractionData,
  VcInvocationService,
} from './vc.invocation.service';

describe('VcInvocationService', () => {
  let service: VcInvocationService;
  let communicationAdapter: Mocked<CommunicationAdapter>;
  let actorContextService: Mocked<ActorContextService>;
  let virtualContributorMessageService: Mocked<VirtualContributorMessageService>;
  let messageNotificationService: Mocked<MessageNotificationService>;
  let entityManager: Mocked<EntityManager>;

  const makeRoom = (): IRoom =>
    ({
      id: 'room-1',
      type: 'callout',
      vcInteractionsByThread: {},
    }) as unknown as IRoom;

  const makePayload = (
    overrides: Partial<MessagePayload> = {}
  ): MessagePayload => ({
    roomId: 'room-1',
    actorID: 'actor-sender',
    message: {
      id: 'msg-1',
      message: 'Hello VC',
      timestamp: 1000,
    },
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VcInvocationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VcInvocationService);
    communicationAdapter = module.get(CommunicationAdapter);
    actorContextService = module.get(ActorContextService);
    virtualContributorMessageService = module.get(
      VirtualContributorMessageService
    );
    messageNotificationService = module.get(MessageNotificationService);
    entityManager = module.get(getEntityManagerToken());
  });

  describe('processDirectConversation', () => {
    it('should invoke all VC members in the room excluding the sender', async () => {
      const room = makeRoom();
      const payload = makePayload();

      communicationAdapter.getRoomMembers.mockResolvedValue([
        'actor-sender',
        'vc-agent-1',
        'vc-agent-2',
      ]);
      entityManager.find.mockResolvedValue([
        { id: 'vc-agent-1' } as Actor,
        { id: 'vc-agent-2' } as Actor,
      ]);
      actorContextService.buildForActor.mockResolvedValue({
        actorID: 'actor-sender',
      } as any);
      virtualContributorMessageService.invokeVirtualContributor.mockResolvedValue(
        undefined as any
      );

      await service.processDirectConversation(payload, room);

      expect(
        virtualContributorMessageService.invokeVirtualContributor
      ).toHaveBeenCalledTimes(2);
      expect(
        virtualContributorMessageService.invokeVirtualContributor
      ).toHaveBeenCalledWith(
        'vc-agent-1',
        'Hello VC',
        'msg-1', // threadID = message.id for direct conversations
        expect.objectContaining({ actorID: 'actor-sender' }),
        '',
        room
      );
    });

    it('should skip invocation when no other members exist in the room', async () => {
      const room = makeRoom();
      const payload = makePayload();

      communicationAdapter.getRoomMembers.mockResolvedValue(['actor-sender']);

      await service.processDirectConversation(payload, room);

      expect(entityManager.find).not.toHaveBeenCalled();
      expect(
        virtualContributorMessageService.invokeVirtualContributor
      ).not.toHaveBeenCalled();
    });

    it('should skip invocation when no VC agents are found among other members', async () => {
      const room = makeRoom();
      const payload = makePayload();

      communicationAdapter.getRoomMembers.mockResolvedValue([
        'actor-sender',
        'human-agent-1',
      ]);
      entityManager.find.mockResolvedValue([]);

      await service.processDirectConversation(payload, room);

      expect(
        virtualContributorMessageService.invokeVirtualContributor
      ).not.toHaveBeenCalled();
    });
  });

  describe('processExistingThread', () => {
    it('should invoke VC when sender is not the VC itself', async () => {
      const room = makeRoom();
      const payload = makePayload({ actorID: 'human-actor' });
      const vcData: VcInteractionData = {
        virtualContributorActorID: 'vc-actor-1',
      };

      actorContextService.buildForActor.mockResolvedValue({
        actorID: 'human-actor',
      } as any);
      virtualContributorMessageService.invokeVirtualContributor.mockResolvedValue(
        undefined as any
      );

      await service.processExistingThread(payload, room, 'thread-1', vcData);

      expect(
        virtualContributorMessageService.invokeVirtualContributor
      ).toHaveBeenCalledWith(
        'vc-actor-1',
        'Hello VC',
        'thread-1',
        expect.objectContaining({ actorID: 'human-actor' }),
        '',
        room
      );
    });

    it('should skip invocation when the sender is the VC itself to avoid infinite loop', async () => {
      const room = makeRoom();
      const payload = makePayload({ actorID: 'vc-actor-1' });
      const vcData: VcInteractionData = {
        virtualContributorActorID: 'vc-actor-1',
      };

      await service.processExistingThread(payload, room, 'thread-1', vcData);

      expect(
        virtualContributorMessageService.invokeVirtualContributor
      ).not.toHaveBeenCalled();
      expect(actorContextService.buildForActor).not.toHaveBeenCalled();
    });
  });

  describe('processNewThread', () => {
    it('should invoke VC mentions when VC mentions are found in the message', async () => {
      const room = makeRoom();
      const payload = makePayload();

      const vcMentions = [
        {
          actorID: 'vc-1',
          actorType: MentionedEntityType.VIRTUAL_CONTRIBUTOR,
        },
      ];
      messageNotificationService.getMentionsFromText.mockResolvedValue([
        ...vcMentions,
        {
          actorID: 'user-1',
          actorType: MentionedEntityType.USER,
        },
      ]);
      actorContextService.buildForActor.mockResolvedValue({
        actorID: 'actor-sender',
      } as any);
      messageNotificationService.processVirtualContributorMentions.mockResolvedValue(
        undefined
      );

      await service.processNewThread(payload, room, 'thread-1');

      expect(
        messageNotificationService.processVirtualContributorMentions
      ).toHaveBeenCalledWith(
        vcMentions, // only VC mentions
        'Hello VC',
        'thread-1',
        expect.objectContaining({ actorID: 'actor-sender' }),
        room
      );
    });

    it('should skip invocation when no VC mentions are found', async () => {
      const room = makeRoom();
      const payload = makePayload();

      messageNotificationService.getMentionsFromText.mockResolvedValue([
        {
          actorID: 'user-1',
          actorType: MentionedEntityType.USER,
        },
      ]);

      await service.processNewThread(payload, room, 'thread-1');

      expect(actorContextService.buildForActor).not.toHaveBeenCalled();
      expect(
        messageNotificationService.processVirtualContributorMentions
      ).not.toHaveBeenCalled();
    });

    it('should skip invocation when message has no mentions at all', async () => {
      const room = makeRoom();
      const payload = makePayload();

      messageNotificationService.getMentionsFromText.mockResolvedValue([]);

      await service.processNewThread(payload, room, 'thread-1');

      expect(
        messageNotificationService.processVirtualContributorMentions
      ).not.toHaveBeenCalled();
    });
  });
});

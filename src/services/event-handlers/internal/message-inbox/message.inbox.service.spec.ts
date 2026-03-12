import { RoomType } from '@common/enums/room.type';
import { MutationType } from '@common/enums/subscriptions';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomServiceEvents } from '@domain/communication/room/room.service.events';
import { RoomLookupService } from '@domain/communication/room-lookup/room.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { MessageEditedEvent } from './message.edited.event';
import { MessageInboxService } from './message.inbox.service';
import { MessageNotificationService } from './message.notification.service';
import { MessageReceivedEvent } from './message.received.event';
import { MessageRedactedEvent } from './message.redacted.event';
import { ReactionAddedEvent } from './reaction.added.event';
import { ReactionRemovedEvent } from './reaction.removed.event';
import { RoomCreatedEvent } from './room.created.event';
import { RoomDmRequestedEvent } from './room.dm.requested.event';
import { RoomMemberLeftEvent } from './room.member.left.event';
import { RoomMemberUpdatedEvent } from './room.member.updated.event';
import { RoomReceiptUpdatedEvent } from './room.receipt.updated.event';
import { VcInvocationService } from './vc.invocation.service';

describe('MessageInboxService', () => {
  let service: MessageInboxService;
  let roomLookupService: Mocked<RoomLookupService>;
  let subscriptionPublishService: Mocked<SubscriptionPublishService>;
  let actorContextService: Mocked<ActorContextService>;
  let roomServiceEvents: Mocked<RoomServiceEvents>;
  let inAppNotificationService: Mocked<InAppNotificationService>;
  let messageNotificationService: Mocked<MessageNotificationService>;
  let vcInvocationService: Mocked<VcInvocationService>;
  let conversationService: Mocked<ConversationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageInboxService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MessageInboxService);
    roomLookupService = module.get(RoomLookupService);
    subscriptionPublishService = module.get(SubscriptionPublishService);
    actorContextService = module.get(ActorContextService);
    roomServiceEvents = module.get(RoomServiceEvents);
    inAppNotificationService = module.get(InAppNotificationService);
    messageNotificationService = module.get(MessageNotificationService);
    vcInvocationService = module.get(VcInvocationService);
    conversationService = module.get(ConversationService);
  });

  const makeRoom = (overrides: Partial<IRoom> = {}): any => ({
    id: 'room-1',
    type: RoomType.CALLOUT,
    messagesCount: 5,
    vcInteractionsByThread: {},
    ...overrides,
  });

  describe('handleMessageReceived', () => {
    const basePayload = {
      roomId: 'room-1',
      actorID: 'actor-1',
      message: {
        id: 'msg-1',
        message: 'Hello',
        threadID: undefined as string | undefined,
        timestamp: 1000,
      },
    };

    it('should increment message count and publish subscription event for non-conversation rooms', async () => {
      const room = makeRoom({ type: RoomType.CALLOUT });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.incrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      actorContextService.buildForActor.mockResolvedValue({} as any);
      messageNotificationService.processMessageNotifications.mockResolvedValue(
        undefined
      );
      vcInvocationService.processNewThread.mockResolvedValue(undefined);

      await service.handleMessageReceived(
        new MessageReceivedEvent(basePayload as any)
      );

      expect(roomLookupService.incrementMessagesCount).toHaveBeenCalledWith(
        'room-1'
      );
      expect(subscriptionPublishService.publishRoomEvent).toHaveBeenCalledWith(
        room,
        MutationType.CREATE,
        expect.objectContaining({ id: 'msg-1', message: 'Hello' })
      );
    });

    it('should process notifications for non-conversation rooms', async () => {
      const room = makeRoom({ type: RoomType.POST });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.incrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      actorContextService.buildForActor.mockResolvedValue({
        actorID: 'actor-1',
      } as any);
      messageNotificationService.processMessageNotifications.mockResolvedValue(
        undefined
      );
      vcInvocationService.processNewThread.mockResolvedValue(undefined);

      await service.handleMessageReceived(
        new MessageReceivedEvent(basePayload as any)
      );

      expect(
        messageNotificationService.processMessageNotifications
      ).toHaveBeenCalledWith(
        room,
        expect.objectContaining({ id: 'msg-1' }),
        expect.objectContaining({ actorID: 'actor-1' }),
        undefined
      );
    });

    it('should skip notifications and publish conversation event for conversation rooms', async () => {
      const room = makeRoom({ type: RoomType.CONVERSATION });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.incrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      conversationService.findConversationByRoomId.mockResolvedValue({
        id: 'conv-1',
      } as any);
      conversationService.getConversationMemberAgentIds.mockResolvedValue([
        'agent-a',
        'agent-b',
      ]);
      vcInvocationService.processDirectConversation.mockResolvedValue(
        undefined
      );

      await service.handleMessageReceived(
        new MessageReceivedEvent(basePayload as any)
      );

      expect(
        messageNotificationService.processMessageNotifications
      ).not.toHaveBeenCalled();
      expect(
        subscriptionPublishService.publishConversationEvent
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          memberAgentIds: ['agent-a', 'agent-b'],
          messageReceived: expect.objectContaining({ roomId: 'room-1' }),
        })
      );
    });

    it('should delegate to VC direct conversation processing for conversation rooms', async () => {
      const room = makeRoom({ type: RoomType.CONVERSATION_DIRECT });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.incrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      conversationService.findConversationByRoomId.mockResolvedValue({
        id: 'conv-1',
      } as any);
      conversationService.getConversationMemberAgentIds.mockResolvedValue([]);
      vcInvocationService.processDirectConversation.mockResolvedValue(
        undefined
      );

      await service.handleMessageReceived(
        new MessageReceivedEvent(basePayload as any)
      );

      expect(
        vcInvocationService.processDirectConversation
      ).toHaveBeenCalledWith(basePayload, room);
      expect(vcInvocationService.processNewThread).not.toHaveBeenCalled();
      expect(vcInvocationService.processExistingThread).not.toHaveBeenCalled();
    });

    it('should invoke processExistingThread when vcInteractionsByThread has data for the thread', async () => {
      const vcData = { virtualContributorActorID: 'vc-actor-1' };
      const room = makeRoom({
        type: RoomType.CALLOUT,
        vcInteractionsByThread: { 'thread-1': vcData } as any,
      });
      const payload = {
        ...basePayload,
        message: { ...basePayload.message, threadID: 'thread-1' },
      };

      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.incrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      actorContextService.buildForActor.mockResolvedValue({} as any);
      messageNotificationService.processMessageNotifications.mockResolvedValue(
        undefined
      );
      vcInvocationService.processExistingThread.mockResolvedValue(undefined);

      await service.handleMessageReceived(
        new MessageReceivedEvent(payload as any)
      );

      expect(vcInvocationService.processExistingThread).toHaveBeenCalledWith(
        payload,
        room,
        'thread-1',
        vcData
      );
    });

    it('should invoke processNewThread when no vcInteraction exists for the thread', async () => {
      const room = makeRoom({ type: RoomType.CALLOUT });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.incrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      actorContextService.buildForActor.mockResolvedValue({} as any);
      messageNotificationService.processMessageNotifications.mockResolvedValue(
        undefined
      );
      vcInvocationService.processNewThread.mockResolvedValue(undefined);

      await service.handleMessageReceived(
        new MessageReceivedEvent(basePayload as any)
      );

      // threadID is undefined, so threadID = message.id = 'msg-1'
      expect(vcInvocationService.processNewThread).toHaveBeenCalledWith(
        basePayload,
        room,
        'msg-1'
      );
    });
  });

  describe('handleMessageEdited', () => {
    it('should publish UPDATE event with original message reactions and timestamp', async () => {
      const originalMessage = {
        id: 'orig-msg-1',
        timestamp: 999,
        reactions: [{ id: 'r-1', emoji: '👍' }],
      };
      const room = makeRoom();
      roomLookupService.getMessageInRoom.mockResolvedValue({
        message: originalMessage,
        room,
      } as any);

      await service.handleMessageEdited(
        new MessageEditedEvent({
          roomId: 'room-1',
          senderActorID: 'actor-1',
          originalMessageId: 'orig-msg-1',
          newMessageId: 'new-msg-1',
          newContent: 'Updated content',
          threadId: 'thread-1',
          timestamp: 2000,
        })
      );

      expect(subscriptionPublishService.publishRoomEvent).toHaveBeenCalledWith(
        room,
        MutationType.UPDATE,
        expect.objectContaining({
          id: 'orig-msg-1',
          message: 'Updated content',
          timestamp: 999,
          reactions: [{ id: 'r-1', emoji: '👍' }],
        })
      );
    });

    it('should not publish event when original message is not found', async () => {
      roomLookupService.getMessageInRoom.mockResolvedValue({
        message: null,
        room: makeRoom(),
      } as any);

      await service.handleMessageEdited(
        new MessageEditedEvent({
          roomId: 'room-1',
          senderActorID: 'actor-1',
          originalMessageId: 'missing-msg',
          newMessageId: 'new-msg-1',
          newContent: 'Updated content',
          timestamp: 2000,
        })
      );

      expect(
        subscriptionPublishService.publishRoomEvent
      ).not.toHaveBeenCalled();
    });
  });

  describe('handleMessageRedacted', () => {
    it('should decrement message count, delete notifications, and publish DELETE event', async () => {
      const room = makeRoom({ type: RoomType.CALLOUT });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.decrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      inAppNotificationService.deleteAllByMessageId.mockResolvedValue(
        undefined as any
      );
      actorContextService.buildForActor.mockResolvedValue({} as any);
      roomServiceEvents.processActivityMessageRemoved.mockResolvedValue(
        undefined as any
      );

      await service.handleMessageRedacted(
        new MessageRedactedEvent({
          roomId: 'room-1',
          redactorActorID: 'actor-1',
          redactedMessageId: 'del-msg-1',
          redactionMessageId: 'redact-1',
          timestamp: 3000,
        })
      );

      expect(roomLookupService.decrementMessagesCount).toHaveBeenCalledWith(
        'room-1'
      );
      expect(
        inAppNotificationService.deleteAllByMessageId
      ).toHaveBeenCalledWith('del-msg-1');
      expect(subscriptionPublishService.publishRoomEvent).toHaveBeenCalledWith(
        room,
        MutationType.DELETE,
        expect.objectContaining({ id: 'del-msg-1' })
      );
    });

    it('should publish conversation event when redacting message in conversation room', async () => {
      const room = makeRoom({ type: RoomType.CONVERSATION });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.decrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      inAppNotificationService.deleteAllByMessageId.mockResolvedValue(
        undefined as any
      );
      actorContextService.buildForActor.mockResolvedValue({} as any);
      roomServiceEvents.processActivityMessageRemoved.mockResolvedValue(
        undefined as any
      );
      conversationService.findConversationByRoomId.mockResolvedValue({
        id: 'conv-1',
      } as any);
      conversationService.getConversationMemberAgentIds.mockResolvedValue([
        'agent-a',
      ]);

      await service.handleMessageRedacted(
        new MessageRedactedEvent({
          roomId: 'room-1',
          redactorActorID: 'actor-1',
          redactedMessageId: 'del-msg-1',
          redactionMessageId: 'redact-1',
          timestamp: 3000,
        })
      );

      expect(
        subscriptionPublishService.publishConversationEvent
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          memberAgentIds: ['agent-a'],
          messageRemoved: expect.objectContaining({
            roomId: 'room-1',
            messageId: 'del-msg-1',
          }),
        })
      );
    });
  });

  describe('handleRoomReceiptUpdated', () => {
    it('should publish receipt event and conversation event for conversation rooms', async () => {
      const room = makeRoom({ type: RoomType.CONVERSATION });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);

      await service.handleRoomReceiptUpdated(
        new RoomReceiptUpdatedEvent({
          roomId: 'room-1',
          actorID: 'actor-1',
          eventId: 'evt-1',
          timestamp: 4000,
        })
      );

      expect(
        subscriptionPublishService.publishRoomReceiptEvent
      ).toHaveBeenCalledWith(
        room,
        expect.objectContaining({ actorID: 'actor-1' })
      );
      expect(
        subscriptionPublishService.publishConversationEvent
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          memberAgentIds: ['actor-1'],
          readReceiptUpdated: expect.objectContaining({
            roomId: 'room-1',
            lastReadMessageId: 'evt-1',
          }),
        })
      );
    });

    it('should not publish conversation event for non-conversation rooms', async () => {
      const room = makeRoom({ type: RoomType.CALLOUT });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);

      await service.handleRoomReceiptUpdated(
        new RoomReceiptUpdatedEvent({
          roomId: 'room-1',
          actorID: 'actor-1',
          eventId: 'evt-1',
          timestamp: 4000,
        })
      );

      expect(
        subscriptionPublishService.publishRoomReceiptEvent
      ).toHaveBeenCalled();
      expect(
        subscriptionPublishService.publishConversationEvent
      ).not.toHaveBeenCalled();
    });
  });

  describe('handleReactionAdded', () => {
    it('should publish CREATE event for the reaction', async () => {
      const room = makeRoom();
      roomLookupService.getRoomOrFail.mockResolvedValue(room);

      await service.handleReactionAdded(
        new ReactionAddedEvent({
          roomId: 'room-1',
          messageId: 'msg-1',
          reactionId: 'react-1',
          emoji: '👍',
          actorID: 'actor-1',
          timestamp: 5000,
        })
      );

      expect(subscriptionPublishService.publishRoomEvent).toHaveBeenCalledWith(
        room,
        MutationType.CREATE,
        expect.objectContaining({
          id: 'react-1',
          emoji: '👍',
          sender: 'actor-1',
          timestamp: 5000,
        }),
        'msg-1'
      );
    });
  });

  describe('handleReactionRemoved', () => {
    it('should publish DELETE event for the reaction', async () => {
      const room = makeRoom();
      roomLookupService.getRoomOrFail.mockResolvedValue(room);

      await service.handleReactionRemoved(
        new ReactionRemovedEvent({
          roomId: 'room-1',
          messageId: 'msg-1',
          reactionId: 'react-1',
          timestamp: 6000,
        })
      );

      expect(subscriptionPublishService.publishRoomEvent).toHaveBeenCalledWith(
        room,
        MutationType.DELETE,
        expect.objectContaining({
          id: 'react-1',
          emoji: '',
          sender: '',
          timestamp: 6000,
        }),
        'msg-1'
      );
    });
  });

  describe('handleRoomCreated', () => {
    it('should complete without error (logging only)', async () => {
      await service.handleRoomCreated(
        new RoomCreatedEvent({
          roomId: 'room-1',
          creatorActorID: 'actor-1',
          roomType: 'callout',
          timestamp: 7000,
        })
      );

      // No service calls expected - logging only
      expect(roomLookupService.getRoomOrFail).not.toHaveBeenCalled();
    });
  });

  describe('handleRoomDmRequested', () => {
    it('should complete without error (logging only)', async () => {
      await service.handleRoomDmRequested(
        new RoomDmRequestedEvent({
          initiatorActorID: 'actor-1',
          targetActorID: 'actor-2',
          timestamp: 8000,
        })
      );

      expect(roomLookupService.getRoomOrFail).not.toHaveBeenCalled();
    });
  });

  describe('handleRoomMemberLeft', () => {
    it('should complete without error (logging only)', async () => {
      await service.handleRoomMemberLeft(
        new RoomMemberLeftEvent({
          roomId: 'room-1',
          actorID: 'actor-1',
          reason: 'left voluntarily',
          timestamp: 9000,
        })
      );

      expect(roomLookupService.getRoomOrFail).not.toHaveBeenCalled();
    });
  });

  describe('handleRoomMemberUpdated', () => {
    it('should complete without error (logging only)', async () => {
      await service.handleRoomMemberUpdated(
        new RoomMemberUpdatedEvent({
          roomId: 'room-1',
          memberActorID: 'actor-1',
          senderActorID: 'actor-2',
          membership: 'join',
          timestamp: 10000,
        })
      );

      expect(roomLookupService.getRoomOrFail).not.toHaveBeenCalled();
    });
  });

  describe('handleMessageRedacted - conversation not found', () => {
    it('should skip conversation event when conversation is not found for conversation room', async () => {
      const room = makeRoom({ type: RoomType.CONVERSATION });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.decrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      inAppNotificationService.deleteAllByMessageId.mockResolvedValue(
        undefined as any
      );
      actorContextService.buildForActor.mockResolvedValue({} as any);
      roomServiceEvents.processActivityMessageRemoved.mockResolvedValue(
        undefined as any
      );
      conversationService.findConversationByRoomId.mockResolvedValue(null);

      await service.handleMessageRedacted(
        new MessageRedactedEvent({
          roomId: 'room-1',
          redactorActorID: 'actor-1',
          redactedMessageId: 'del-msg-1',
          redactionMessageId: 'redact-1',
          timestamp: 3000,
        })
      );

      // Room event should still be published
      expect(subscriptionPublishService.publishRoomEvent).toHaveBeenCalled();
      // Conversation event should NOT be published because conversation was not found
      expect(
        subscriptionPublishService.publishConversationEvent
      ).not.toHaveBeenCalled();
    });
  });

  describe('handleMessageReceived - conversation not found', () => {
    it('should skip conversation event when conversation is not found for conversation room', async () => {
      const room = makeRoom({ type: RoomType.CONVERSATION });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.incrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      conversationService.findConversationByRoomId.mockResolvedValue(null);
      vcInvocationService.processDirectConversation.mockResolvedValue(
        undefined
      );

      await service.handleMessageReceived(
        new MessageReceivedEvent({
          roomId: 'room-1',
          actorID: 'actor-1',
          message: {
            id: 'msg-1',
            message: 'Hello',
            timestamp: 1000,
          },
        } as any)
      );

      expect(
        subscriptionPublishService.publishConversationEvent
      ).not.toHaveBeenCalled();
    });
  });
});

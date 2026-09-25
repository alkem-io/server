import { RoomType } from '@common/enums/room.type';
import { MutationType } from '@common/enums/subscriptions';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomReadinessService } from '@domain/communication/room/room.readiness.service';
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
import { RoomMemberUpdatedEvent } from './room.member.updated.event';
import { RoomReceiptUpdatedEvent } from './room.receipt.updated.event';
import { RoomUpdatedEvent } from './room.updated.event';
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
  let roomReadinessService: Mocked<RoomReadinessService>;
  let actorService: Mocked<ActorService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    roomReadinessService = module.get(RoomReadinessService);
    actorService = module.get(ActorService);
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
      conversationService.getConversationMemberActorIds.mockResolvedValue([
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
          memberActorIds: ['agent-a', 'agent-b'],
          messageReceived: expect.objectContaining({ roomId: 'room-1' }),
        })
      );
    });

    it('resolves conversation + memberActorIds ONCE per conversation message and shares it (034-messaging-notifications D-13, risk R-8)', async () => {
      const room = makeRoom({ type: RoomType.CONVERSATION });
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      roomLookupService.incrementMessagesCount.mockResolvedValue(
        undefined as any
      );
      conversationService.findConversationByRoomId.mockResolvedValue({
        id: 'conv-1',
      } as any);
      conversationService.getConversationMemberActorIds.mockResolvedValue([
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
        conversationService.findConversationByRoomId
      ).toHaveBeenCalledTimes(1);
      expect(
        conversationService.getConversationMemberActorIds
      ).toHaveBeenCalledTimes(1);
      // Both the subscription publish AND the new notification branch see
      // the SAME hoisted memberActorIds — the conversation-notification
      // service was invoked (auto-mocked) rather than skipped.
      expect(
        subscriptionPublishService.publishConversationEvent
      ).toHaveBeenCalledWith(
        expect.objectContaining({ memberActorIds: ['agent-a', 'agent-b'] })
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
      conversationService.getConversationMemberActorIds.mockResolvedValue([]);
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

    // feature 013: an edit changes the TEXT only. The published IMessage is
    // rebuilt from the edit payload, so anything the attachments resolver needs
    // has to be carried over from the original message — otherwise
    // `Message.attachments` resolves to [] and editing a message makes its
    // media vanish for every live subscriber.
    it('carries the attachment resolution fields over from the original message', async () => {
      const originalMessage = {
        id: 'orig-msg-1',
        timestamp: 999,
        reactions: [],
        rawAttachments: [{ media_id: 'media-1' }],
        storageBucketId: 'bucket-1',
        roomID: 'room-1',
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
          timestamp: 2000,
        })
      );

      expect(subscriptionPublishService.publishRoomEvent).toHaveBeenCalledWith(
        room,
        MutationType.UPDATE,
        expect.objectContaining({
          rawAttachments: [{ media_id: 'media-1' }],
          storageBucketId: 'bucket-1',
          roomID: 'room-1',
        })
      );
    });

    it('falls back to the room id when the original message carries no roomID', async () => {
      const room = makeRoom({ id: 'room-1' });
      roomLookupService.getMessageInRoom.mockResolvedValue({
        message: {
          id: 'orig-msg-1',
          timestamp: 999,
          reactions: [],
          rawAttachments: [{ media_id: 'media-1' }],
        },
        room,
      } as any);

      await service.handleMessageEdited(
        new MessageEditedEvent({
          roomId: 'room-1',
          senderActorID: 'actor-1',
          originalMessageId: 'orig-msg-1',
          newMessageId: 'new-msg-1',
          newContent: 'Updated content',
          timestamp: 2000,
        })
      );

      expect(subscriptionPublishService.publishRoomEvent).toHaveBeenCalledWith(
        room,
        MutationType.UPDATE,
        expect.objectContaining({ roomID: 'room-1' })
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
      conversationService.getConversationMemberActorIds.mockResolvedValue([
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
          memberActorIds: ['agent-a'],
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
          memberActorIds: ['actor-1'],
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

  describe('pending room confirmation (first backend-originated event)', () => {
    const pending = { state: 'PENDING', reason: 'AWAITING_CONFIRMATION' };
    const ready = { state: 'READY', reason: 'PROVISIONED' };
    const failed = { state: 'FAILED', reason: 'ADAPTER_TIMEOUT' };

    const expectConfirmedOnce = (room: any) => {
      expect(roomReadinessService.record).toHaveBeenCalledTimes(1);
      expect(roomReadinessService.record).toHaveBeenCalledWith(
        room,
        { state: 'READY', reason: 'CONFIRMED' },
        'BACKEND_CONFIRMATION'
      );
    };

    it('room.created confirms a PENDING room exactly once', async () => {
      const room = makeRoom({
        type: RoomType.CONVERSATION_GROUP,
        readiness: pending,
      } as any);
      roomLookupService.getRoomOrFail.mockResolvedValue(room);

      await service.handleRoomCreated(
        new RoomCreatedEvent({
          roomId: 'room-1',
          creatorActorID: 'actor-1',
          roomType: 'conversation_group',
          timestamp: 1000,
        })
      );

      expectConfirmedOnce(room);
    });

    it('room.created for a room the platform does not know does nothing', async () => {
      roomLookupService.getRoomOrFail.mockRejectedValue(new Error('no room'));

      await expect(
        service.handleRoomCreated(
          new RoomCreatedEvent({
            roomId: 'unknown',
            creatorActorID: 'actor-1',
            roomType: 'conversation_group',
            timestamp: 1000,
          })
        )
      ).resolves.toBeUndefined();
      expect(roomReadinessService.record).not.toHaveBeenCalled();
    });

    it('a member join confirms a PENDING room (also for direct rooms)', async () => {
      const room = makeRoom({
        type: RoomType.CONVERSATION_DIRECT,
        readiness: pending,
      } as any);
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      conversationService.findConversationByRoomId.mockResolvedValue({
        id: 'conv-1',
      } as any);

      await service.handleRoomMemberUpdated(
        new RoomMemberUpdatedEvent({
          roomId: 'room-1',
          memberActorID: 'actor-2',
          senderActorID: 'actor-2',
          membership: 'join',
          timestamp: 1000,
        })
      );

      expectConfirmedOnce(room);
    });

    it('a member leave does not confirm a PENDING room', async () => {
      const room = makeRoom({
        type: RoomType.CONVERSATION_GROUP,
        readiness: pending,
      } as any);
      roomLookupService.getRoomOrFail.mockResolvedValue(room);
      conversationService.findConversationByRoomId.mockResolvedValue({
        id: 'conv-1',
      } as any);
      conversationService.getConversationMemberActorIds.mockResolvedValue([
        'actor-1',
        'actor-2',
      ]);
      conversationService.persistMemberRemoved.mockResolvedValue(1);
      conversationService.getConversationOrFail.mockResolvedValue({
        id: 'conv-1',
      } as any);

      await service.handleRoomMemberUpdated(
        new RoomMemberUpdatedEvent({
          roomId: 'room-1',
          memberActorID: 'actor-2',
          senderActorID: 'actor-2',
          membership: 'leave',
          timestamp: 1000,
        })
      );

      expect(roomReadinessService.record).not.toHaveBeenCalled();
    });

    it('message.received confirms a PENDING room exactly once', async () => {
      const room = makeRoom({
        type: RoomType.CALLOUT,
        readiness: pending,
      } as any);
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
        new MessageReceivedEvent({
          roomId: 'room-1',
          actorID: 'actor-1',
          message: { id: 'msg-1', message: 'Hello', timestamp: 1000 },
        } as any)
      );

      expectConfirmedOnce(room);
    });

    it('room.updated confirms a PENDING room exactly once', async () => {
      const room = makeRoom({
        type: RoomType.CALLOUT,
        readiness: pending,
      } as any);
      roomLookupService.updatePartial.mockResolvedValue(undefined);
      roomLookupService.getRoomOrFail.mockResolvedValue(room);

      await service.handleRoomUpdated(
        new RoomUpdatedEvent({
          roomId: 'room-1',
          displayName: 'renamed',
          timestamp: 1000,
        })
      );

      expectConfirmedOnce(room);
    });

    it.each([
      ['READY', ready],
      ['FAILED', failed],
      ['none recorded', undefined],
    ])('leaves a %s room untouched', async (_label, readiness) => {
      const room = makeRoom({ type: RoomType.CALLOUT, readiness } as any);
      roomLookupService.updatePartial.mockResolvedValue(undefined);
      roomLookupService.getRoomOrFail.mockResolvedValue(room);

      await service.handleRoomUpdated(
        new RoomUpdatedEvent({
          roomId: 'room-1',
          displayName: 'renamed',
          timestamp: 1000,
        })
      );

      expect(roomReadinessService.record).not.toHaveBeenCalled();
    });
  });

  describe('governance channel', () => {
    const governance = () =>
      subscriptionPublishService.publishConversationGovernanceEvent;
    const legacy = () => subscriptionPublishService.publishConversationEvent;
    const groupRoom = () =>
      makeRoom({
        type: RoomType.CONVERSATION_GROUP,
        readiness: { state: 'READY' },
      } as any);
    const conversation = { id: 'conv-1', room: { id: 'room-1' } } as any;

    it('publishes exactly one MEMBER_ADDED beside the legacy event on a join', async () => {
      roomLookupService.getRoomOrFail.mockResolvedValue(groupRoom());
      conversationService.findConversationByRoomId.mockResolvedValue(
        conversation
      );
      conversationService.persistMemberAdded.mockResolvedValue(
        undefined as any
      );
      conversationService.getConversationOrFail.mockResolvedValue(conversation);
      conversationService.getConversationMemberActorIds.mockResolvedValue([
        'a',
        'b',
        'c',
      ]);
      actorService.getActorOrFail.mockResolvedValue({ id: 'c' } as any);

      await service.handleRoomMemberUpdated(
        new RoomMemberUpdatedEvent({
          roomId: 'room-1',
          memberActorID: 'c',
          senderActorID: 'a',
          membership: 'join',
          timestamp: 1,
        })
      );

      expect(legacy()).toHaveBeenCalledTimes(1);
      expect(governance()).toHaveBeenCalledTimes(1);
      expect(governance()).toHaveBeenCalledWith(['a', 'b', 'c'], {
        eventType: 'MEMBER_ADDED',
        conversationID: 'conv-1',
        conversation,
        member: { id: 'c' },
        memberID: 'c',
      });
    });

    it('publishes exactly one MEMBER_REMOVED to the members captured before the removal (the removed member included)', async () => {
      roomLookupService.getRoomOrFail.mockResolvedValue(groupRoom());
      conversationService.findConversationByRoomId.mockResolvedValue(
        conversation
      );
      conversationService.getConversationMemberActorIds.mockResolvedValue([
        'a',
        'b',
        'c',
      ]);
      conversationService.persistMemberRemoved.mockResolvedValue(2);
      conversationService.getConversationOrFail.mockResolvedValue(conversation);

      await service.handleRoomMemberUpdated(
        new RoomMemberUpdatedEvent({
          roomId: 'room-1',
          memberActorID: 'c',
          senderActorID: 'a',
          membership: 'leave',
          timestamp: 1,
        })
      );

      expect(legacy()).toHaveBeenCalledTimes(1);
      expect(governance()).toHaveBeenCalledTimes(1);
      expect(governance()).toHaveBeenCalledWith(['a', 'b', 'c'], {
        eventType: 'MEMBER_REMOVED',
        conversationID: 'conv-1',
        conversation,
        memberID: 'c',
      });
    });

    it('publishes MEMBER_REMOVED then CONVERSATION_DELETED (conversation null) when the last member leaves', async () => {
      roomLookupService.getRoomOrFail.mockResolvedValue(groupRoom());
      conversationService.findConversationByRoomId.mockResolvedValue(
        conversation
      );
      conversationService.getConversationMemberActorIds.mockResolvedValue([
        'c',
      ]);
      conversationService.persistMemberRemoved.mockResolvedValue(0);
      conversationService.getConversationOrFail.mockResolvedValue(conversation);
      conversationService.deleteConversation.mockResolvedValue(conversation);

      await service.handleRoomMemberUpdated(
        new RoomMemberUpdatedEvent({
          roomId: 'room-1',
          memberActorID: 'c',
          senderActorID: 'c',
          membership: 'leave',
          timestamp: 1,
        })
      );

      expect(legacy()).toHaveBeenCalledTimes(2);
      expect(governance()).toHaveBeenCalledTimes(2);
      expect(governance().mock.calls[0][1]).toMatchObject({
        eventType: 'MEMBER_REMOVED',
        memberID: 'c',
      });
      expect(governance().mock.calls[1][1]).toEqual({
        eventType: 'CONVERSATION_DELETED',
        conversationID: 'conv-1',
      });
    });

    it('publishes exactly one CONVERSATION_UPDATED beside the legacy event on room.updated', async () => {
      roomLookupService.updatePartial.mockResolvedValue(undefined);
      roomLookupService.getRoomOrFail.mockResolvedValue(groupRoom());
      conversationService.findConversationByRoomId.mockResolvedValue(
        conversation
      );
      conversationService.getConversationMemberActorIds.mockResolvedValue([
        'a',
        'b',
      ]);

      await service.handleRoomUpdated(
        new RoomUpdatedEvent({
          roomId: 'room-1',
          displayName: 'renamed',
          timestamp: 1,
        })
      );

      expect(legacy()).toHaveBeenCalledTimes(1);
      expect(governance()).toHaveBeenCalledWith(['a', 'b'], {
        eventType: 'CONVERSATION_UPDATED',
        conversationID: 'conv-1',
        conversation,
      });
    });

    describe('never publishes for message, reaction or receipt triggers', () => {
      beforeEach(() => {
        const room = makeRoom({
          type: RoomType.CONVERSATION_DIRECT,
          readiness: { state: 'READY' },
        } as any);
        roomLookupService.getRoomOrFail.mockResolvedValue(room);
        roomLookupService.incrementMessagesCount.mockResolvedValue(
          undefined as any
        );
        roomLookupService.decrementMessagesCount.mockResolvedValue(
          undefined as any
        );
        roomLookupService.getMessageInRoom.mockResolvedValue({
          id: 'msg-1',
          reactions: [],
          timestamp: 1,
        } as any);
        conversationService.findConversationByRoomId.mockResolvedValue(
          conversation
        );
        conversationService.getConversationMemberActorIds.mockResolvedValue([
          'a',
          'b',
        ]);
        actorContextService.buildForActor.mockResolvedValue({} as any);
        vcInvocationService.processDirectConversation.mockResolvedValue(
          undefined
        );
      });

      it('message.received', async () => {
        await service.handleMessageReceived(
          new MessageReceivedEvent({
            roomId: 'room-1',
            actorID: 'a',
            message: { id: 'msg-1', message: 'hi', timestamp: 1 },
          } as any)
        );
        expect(legacy()).toHaveBeenCalled();
        expect(governance()).not.toHaveBeenCalled();
      });

      it('message.edited', async () => {
        await service.handleMessageEdited(
          new MessageEditedEvent({
            roomId: 'room-1',
            messageId: 'msg-1',
            actorID: 'a',
            newContent: 'edited',
            timestamp: 2,
          } as any)
        );
        expect(governance()).not.toHaveBeenCalled();
      });

      it('message.redacted', async () => {
        await service.handleMessageRedacted(
          new MessageRedactedEvent({
            roomId: 'room-1',
            messageId: 'msg-1',
            actorID: 'a',
            timestamp: 2,
          } as any)
        );
        expect(legacy()).toHaveBeenCalled();
        expect(governance()).not.toHaveBeenCalled();
      });

      it('reaction.added and reaction.removed', async () => {
        await service.handleReactionAdded(
          new ReactionAddedEvent({
            roomId: 'room-1',
            messageId: 'msg-1',
            reactionId: 'r-1',
            actorID: 'a',
            emoji: '👍',
            timestamp: 2,
          } as any)
        );
        await service.handleReactionRemoved(
          new ReactionRemovedEvent({
            roomId: 'room-1',
            messageId: 'msg-1',
            reactionId: 'r-1',
            actorID: 'a',
            timestamp: 3,
          } as any)
        );
        expect(governance()).not.toHaveBeenCalled();
      });

      it('room.receipt.updated', async () => {
        await service.handleRoomReceiptUpdated(
          new RoomReceiptUpdatedEvent({
            roomId: 'room-1',
            actorID: 'a',
            eventId: 'msg-1',
            timestamp: 2,
          })
        );
        expect(legacy()).toHaveBeenCalled();
        expect(governance()).not.toHaveBeenCalled();
      });
    });
  });

  describe('handleRoomCreated', () => {
    it('looks the room up and leaves a room that is not awaiting confirmation untouched', async () => {
      roomLookupService.getRoomOrFail.mockResolvedValue(
        makeRoom({
          readiness: { state: 'READY', reason: 'PROVISIONED' },
        } as any)
      );

      await service.handleRoomCreated(
        new RoomCreatedEvent({
          roomId: 'room-1',
          creatorActorID: 'actor-1',
          roomType: 'callout',
          timestamp: 7000,
        })
      );

      expect(roomLookupService.getRoomOrFail).toHaveBeenCalledWith('room-1');
      expect(roomReadinessService.record).not.toHaveBeenCalled();
      expect(
        subscriptionPublishService.publishRoomEvent
      ).not.toHaveBeenCalled();
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

  describe('handleRoomMemberUpdated', () => {
    it('should return early for non-join/leave membership types', async () => {
      await service.handleRoomMemberUpdated(
        new RoomMemberUpdatedEvent({
          roomId: 'room-1',
          memberActorID: 'actor-1',
          senderActorID: 'actor-2',
          membership: 'invite',
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

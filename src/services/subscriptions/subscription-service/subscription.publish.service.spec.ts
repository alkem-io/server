import { SubscriptionType } from '@common/enums/subscription.type';
import { MutationType } from '@common/enums/subscriptions';
import { Test, TestingModule } from '@nestjs/testing';
import {
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_CONVERSATION_EVENT,
  SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER,
  SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_VIRTUAL_UPDATED,
} from '@src/common/constants';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { SubscriptionPublishService } from './subscription.publish.service';

describe('SubscriptionPublishService', () => {
  let service: SubscriptionPublishService;
  let activityPubSub: { publish: Mock };
  let roomPubSub: { publish: Mock };
  let vcPubSub: { publish: Mock };
  let inAppNotifPubSub: { publish: Mock };
  let inAppCounterPubSub: { publish: Mock };
  let conversationPubSub: { publish: Mock };

  beforeEach(async () => {
    activityPubSub = { publish: vi.fn().mockResolvedValue(undefined) };
    roomPubSub = { publish: vi.fn().mockResolvedValue(undefined) };
    vcPubSub = { publish: vi.fn().mockResolvedValue(undefined) };
    inAppNotifPubSub = { publish: vi.fn().mockResolvedValue(undefined) };
    inAppCounterPubSub = { publish: vi.fn().mockResolvedValue(undefined) };
    conversationPubSub = { publish: vi.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPublishService,
        {
          provide: SUBSCRIPTION_ACTIVITY_CREATED,
          useValue: activityPubSub,
        },
        {
          provide: SUBSCRIPTION_ROOM_EVENT,
          useValue: roomPubSub,
        },
        {
          provide: SUBSCRIPTION_VIRTUAL_UPDATED,
          useValue: vcPubSub,
        },
        {
          provide: SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
          useValue: inAppNotifPubSub,
        },
        {
          provide: SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER,
          useValue: inAppCounterPubSub,
        },
        {
          provide: SUBSCRIPTION_CONVERSATION_EVENT,
          useValue: conversationPubSub,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SubscriptionPublishService);
  });

  describe('publishActivity', () => {
    it('should publish an activity event with collaborationID in the payload', async () => {
      const activity = { id: 'act-1', type: 'test' } as any;

      await service.publishActivity('collab-1', activity);

      expect(activityPubSub.publish).toHaveBeenCalledWith(
        SubscriptionType.ACTIVITY_CREATED,
        expect.objectContaining({
          collaborationID: 'collab-1',
          activity,
        })
      );
    });
  });

  describe('publishRoomEvent', () => {
    it('should publish a message event when data is an IMessage (has message property)', async () => {
      const room = { id: 'room-1' } as any;
      const messageData = { id: 'msg-1', message: 'Hello world' } as any;

      await service.publishRoomEvent(room, MutationType.CREATE, messageData);

      expect(roomPubSub.publish).toHaveBeenCalledWith(
        SubscriptionType.ROOM_EVENTS,
        expect.objectContaining({
          roomID: 'room-1',
          room,
          message: {
            type: MutationType.CREATE,
            data: messageData,
          },
        })
      );
      // Should NOT have a reaction property
      const payload = roomPubSub.publish.mock.calls[0][1];
      expect(payload.reaction).toBeUndefined();
    });

    it('should publish a reaction event when data is an IMessageReaction (no message property)', async () => {
      const room = { id: 'room-1' } as any;
      const reactionData = {
        id: 'react-1',
        emoji: '1F44D',
        type: 'emoji',
      } as any;

      await service.publishRoomEvent(
        room,
        MutationType.CREATE,
        reactionData,
        'msg-1'
      );

      expect(roomPubSub.publish).toHaveBeenCalledWith(
        SubscriptionType.ROOM_EVENTS,
        expect.objectContaining({
          roomID: 'room-1',
          room,
          reaction: {
            type: MutationType.CREATE,
            messageID: 'msg-1',
            data: reactionData,
          },
        })
      );
      // Should NOT have a message property
      const payload = roomPubSub.publish.mock.calls[0][1];
      expect(payload.message).toBeUndefined();
    });
  });

  describe('publishRoomReceiptEvent', () => {
    it('should publish a receipt event with MutationType.UPDATE', async () => {
      const room = { id: 'room-1' } as any;
      const receiptData = {
        actorID: 'user-1',
        eventId: 'evt-1',
        timestamp: 1234567890,
      };

      await service.publishRoomReceiptEvent(room, receiptData);

      expect(roomPubSub.publish).toHaveBeenCalledWith(
        SubscriptionType.ROOM_EVENTS,
        expect.objectContaining({
          roomID: 'room-1',
          receipt: {
            type: MutationType.UPDATE,
            data: receiptData,
          },
        })
      );
    });
  });

  describe('publishVirtualContributorUpdated', () => {
    it('should publish virtual contributor updated event', () => {
      const vc = { id: 'vc-1', nameID: 'my-vc' } as any;

      service.publishVirtualContributorUpdated(vc);

      expect(vcPubSub.publish).toHaveBeenCalledWith(
        SubscriptionType.VIRTUAL_UPDATED,
        expect.objectContaining({
          virtualContributor: vc,
        })
      );
    });
  });

  describe('publishInAppNotificationReceived', () => {
    it('should publish in-app notification with correct subscription type', () => {
      const notification = {
        id: 'notif-1',
        receiverID: 'user-1',
      } as any;

      service.publishInAppNotificationReceived(notification);

      expect(inAppNotifPubSub.publish).toHaveBeenCalledWith(
        SubscriptionType.IN_APP_NOTIFICATION_RECEIVED,
        expect.objectContaining({
          notification,
        })
      );
    });
  });

  describe('publishInAppNotificationCounter', () => {
    it('should publish notification counter with receiverID and count', () => {
      service.publishInAppNotificationCounter('user-1', 42);

      expect(inAppCounterPubSub.publish).toHaveBeenCalledWith(
        SubscriptionType.IN_APP_NOTIFICATION_COUNTER,
        expect.objectContaining({
          receiverID: 'user-1',
          count: 42,
        })
      );
    });
  });

  describe('publishConversationEvent', () => {
    it('should publish conversation event with provided payload', async () => {
      const payload = {
        eventID: 'conv-evt-1',
        conversationID: 'conv-1',
      } as any;

      await service.publishConversationEvent(payload);

      expect(conversationPubSub.publish).toHaveBeenCalledWith(
        SubscriptionType.CONVERSATION_EVENTS,
        payload
      );
    });
  });
});

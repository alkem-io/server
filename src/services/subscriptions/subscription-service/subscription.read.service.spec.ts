import { SubscriptionType } from '@common/enums/subscription.type';
import { Test, TestingModule } from '@nestjs/testing';
import {
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_CONVERSATION_EVENT,
  SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER,
  SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
  SUBSCRIPTION_POLL_OPTIONS_CHANGED,
  SUBSCRIPTION_POLL_VOTE_UPDATED,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_VIRTUAL_UPDATED,
} from '@src/common/constants';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { pubSubEngineMockFactory } from '@test/utils/pub.sub.engine.mock.factory';
import { type Mock } from 'vitest';
import { SubscriptionReadService } from './subscription.read.service';

describe('SubscriptionReadService', () => {
  let service: SubscriptionReadService;
  let activityPubSub: { asyncIterableIterator: Mock };
  let roomPubSub: { asyncIterableIterator: Mock };
  let vcPubSub: { asyncIterableIterator: Mock };
  let inAppNotifPubSub: { asyncIterableIterator: Mock };
  let inAppCounterPubSub: { asyncIterableIterator: Mock };
  let conversationPubSub: { asyncIterableIterator: Mock };
  let pollVoteUpdatedPubSub: { asyncIterableIterator: Mock };
  let pollOptionsChangedPubSub: { asyncIterableIterator: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const activityProvider = pubSubEngineMockFactory(
      SUBSCRIPTION_ACTIVITY_CREATED
    );
    const roomProvider = pubSubEngineMockFactory(SUBSCRIPTION_ROOM_EVENT);
    const vcProvider = pubSubEngineMockFactory(SUBSCRIPTION_VIRTUAL_UPDATED);
    const inAppNotifProvider = pubSubEngineMockFactory(
      SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED
    );
    const inAppCounterProvider = pubSubEngineMockFactory(
      SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER
    );
    const conversationProvider = pubSubEngineMockFactory(
      SUBSCRIPTION_CONVERSATION_EVENT
    );
    const pollVoteUpdatedProvider = pubSubEngineMockFactory(
      SUBSCRIPTION_POLL_VOTE_UPDATED
    );
    const pollOptionsChangedProvider = pubSubEngineMockFactory(
      SUBSCRIPTION_POLL_OPTIONS_CHANGED
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionReadService,
        activityProvider,
        roomProvider,
        vcProvider,
        inAppNotifProvider,
        inAppCounterProvider,
        conversationProvider,
        pollVoteUpdatedProvider,
        pollOptionsChangedProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SubscriptionReadService);
    activityPubSub = module.get(SUBSCRIPTION_ACTIVITY_CREATED);
    roomPubSub = module.get(SUBSCRIPTION_ROOM_EVENT);
    vcPubSub = module.get(SUBSCRIPTION_VIRTUAL_UPDATED);
    inAppNotifPubSub = module.get(SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED);
    inAppCounterPubSub = module.get(SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER);
    conversationPubSub = module.get(SUBSCRIPTION_CONVERSATION_EVENT);
    pollVoteUpdatedPubSub = module.get(SUBSCRIPTION_POLL_VOTE_UPDATED);
    pollOptionsChangedPubSub = module.get(SUBSCRIPTION_POLL_OPTIONS_CHANGED);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('subscribeToActivities', () => {
    it('should call asyncIterableIterator with ACTIVITY_CREATED', () => {
      const mockIterator = {} as AsyncIterableIterator<SubscriptionType>;
      activityPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = service.subscribeToActivities();

      expect(activityPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        SubscriptionType.ACTIVITY_CREATED
      );
      expect(result).toBe(mockIterator);
    });
  });

  describe('subscribeToRoomEvents', () => {
    it('should call asyncIterableIterator with ROOM_EVENTS', () => {
      const mockIterator = {} as AsyncIterableIterator<SubscriptionType>;
      roomPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = service.subscribeToRoomEvents();

      expect(roomPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        SubscriptionType.ROOM_EVENTS
      );
      expect(result).toBe(mockIterator);
    });
  });

  describe('subscribeToVirtualContributorUpdated', () => {
    it('should call asyncIterableIterator with VIRTUAL_UPDATED', () => {
      const mockIterator = {} as AsyncIterableIterator<SubscriptionType>;
      vcPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = service.subscribeToVirtualContributorUpdated();

      expect(vcPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        SubscriptionType.VIRTUAL_UPDATED
      );
      expect(result).toBe(mockIterator);
    });
  });

  describe('subscribeToInAppNotificationReceived', () => {
    it('should call asyncIterableIterator with IN_APP_NOTIFICATION_RECEIVED', () => {
      const mockIterator = {} as AsyncIterableIterator<SubscriptionType>;
      inAppNotifPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = service.subscribeToInAppNotificationReceived();

      expect(inAppNotifPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        SubscriptionType.IN_APP_NOTIFICATION_RECEIVED
      );
      expect(result).toBe(mockIterator);
    });
  });

  describe('subscribeToInAppNotificationCounter', () => {
    it('should call asyncIterableIterator with IN_APP_NOTIFICATION_COUNTER', () => {
      const mockIterator = {} as AsyncIterableIterator<SubscriptionType>;
      inAppCounterPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = service.subscribeToInAppNotificationCounter();

      expect(inAppCounterPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        SubscriptionType.IN_APP_NOTIFICATION_COUNTER
      );
      expect(result).toBe(mockIterator);
    });
  });

  describe('subscribeToConversationEvents', () => {
    it('should call asyncIterableIterator with CONVERSATION_EVENTS', () => {
      const mockIterator = {} as AsyncIterableIterator<SubscriptionType>;
      conversationPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = service.subscribeToConversationEvents();

      expect(conversationPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        SubscriptionType.CONVERSATION_EVENTS
      );
      expect(result).toBe(mockIterator);
    });
  });

  describe('subscribeToPollVoteUpdated', () => {
    it('should call asyncIterableIterator with POLL_VOTE_UPDATED', () => {
      const mockIterator = {} as AsyncIterableIterator<SubscriptionType>;
      pollVoteUpdatedPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = service.subscribeToPollVoteUpdated();

      expect(pollVoteUpdatedPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        SubscriptionType.POLL_VOTE_UPDATED
      );
      expect(result).toBe(mockIterator);
    });
  });

  describe('subscribeToPollOptionsChanged', () => {
    it('should call asyncIterableIterator with POLL_OPTIONS_CHANGED', () => {
      const mockIterator = {} as AsyncIterableIterator<SubscriptionType>;
      pollOptionsChangedPubSub.asyncIterableIterator.mockReturnValue(
        mockIterator
      );

      const result = service.subscribeToPollOptionsChanged();

      expect(
        pollOptionsChangedPubSub.asyncIterableIterator
      ).toHaveBeenCalledWith(SubscriptionType.POLL_OPTIONS_CHANGED);
      expect(result).toBe(mockIterator);
    });
  });
});

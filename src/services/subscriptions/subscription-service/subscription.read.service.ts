import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
  SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
  SUBSCRIPTION_CONVERSATIONS_UNREAD_COUNT,
  SUBSCRIPTION_USER_CONVERSATION_MESSAGE,
} from '@src/common/constants';
import { SubscriptionType } from '@common/enums/subscription.type';
import { TypedPubSubEngine } from './typed.pub.sub.engine';

@Injectable()
export class SubscriptionReadService {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private activityCreatedSubscription: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_ROOM_EVENT)
    private roomEventsSubscription: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED)
    private subscriptionVirtualContributorUpdated: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED)
    private subscriptionInAppNotificationReceived: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER)
    private subscriptionInAppNotificationCounter: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_CONVERSATIONS_UNREAD_COUNT)
    private subscriptionConversationsUnreadCount: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_USER_CONVERSATION_MESSAGE)
    private subscriptionUserConversationMessage: TypedPubSubEngine
  ) {}

  public subscribeToActivities() {
    return this.activityCreatedSubscription.asyncIterableIterator(
      SubscriptionType.ACTIVITY_CREATED
    );
  }

  public subscribeToRoomEvents() {
    return this.roomEventsSubscription.asyncIterableIterator(
      SubscriptionType.ROOM_EVENTS
    );
  }

  public subscribeToVirtualContributorUpdated() {
    return this.subscriptionVirtualContributorUpdated.asyncIterableIterator(
      SubscriptionType.VIRTUAL_CONTRIBUTOR_UPDATED
    );
  }

  public subscribeToInAppNotificationReceived() {
    return this.subscriptionInAppNotificationReceived.asyncIterableIterator(
      SubscriptionType.IN_APP_NOTIFICATION_RECEIVED
    );
  }

  public subscribeToInAppNotificationCounter() {
    return this.subscriptionInAppNotificationCounter.asyncIterableIterator(
      SubscriptionType.IN_APP_NOTIFICATION_COUNTER
    );
  }

  public subscribeToConversationsUnreadCount() {
    return this.subscriptionConversationsUnreadCount.asyncIterableIterator(
      SubscriptionType.CONVERSATIONS_UNREAD_COUNT
    );
  }

  public subscribeToUserConversationMessage() {
    return this.subscriptionUserConversationMessage.asyncIterableIterator(
      SubscriptionType.USER_CONVERSATION_MESSAGE
    );
  }
}

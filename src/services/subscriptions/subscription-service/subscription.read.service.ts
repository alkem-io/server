import { SubscriptionType } from '@common/enums/subscription.type';
import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_CONVERSATION_EVENT,
  SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER,
  SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_VIRTUAL_UPDATED,
} from '@src/common/constants';
import { TypedPubSubEngine } from './typed.pub.sub.engine';

@Injectable()
export class SubscriptionReadService {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private activityCreatedSubscription: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_ROOM_EVENT)
    private roomEventsSubscription: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_VIRTUAL_UPDATED)
    private subscriptionVirtualContributorUpdated: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED)
    private subscriptionInAppNotificationReceived: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER)
    private subscriptionInAppNotificationCounter: TypedPubSubEngine,
    @Inject(SUBSCRIPTION_CONVERSATION_EVENT)
    private subscriptionConversationEvents: TypedPubSubEngine
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
      SubscriptionType.VIRTUAL_UPDATED
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

  public subscribeToConversationEvents() {
    return this.subscriptionConversationEvents.asyncIterableIterator(
      SubscriptionType.CONVERSATION_EVENTS
    );
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
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
    private subscriptionInAppNotificationReceived: TypedPubSubEngine
  ) {}

  public subscribeToActivities() {
    return this.activityCreatedSubscription.asyncIterator(
      SubscriptionType.ACTIVITY_CREATED
    );
  }

  public subscribeToRoomEvents() {
    return this.roomEventsSubscription.asyncIterator(
      SubscriptionType.ROOM_EVENTS
    );
  }

  public subscribeToVirtualContributorUpdated() {
    return this.subscriptionVirtualContributorUpdated.asyncIterator(
      SubscriptionType.VIRTUAL_CONTRIBUTOR_UPDATED
    );
  }

  public subscribeToInAppNotificationReceived() {
    return this.subscriptionInAppNotificationReceived.asyncIterator(
      SubscriptionType.IN_APP_NOTIFICATION_RECEIVED
    );
  }
}

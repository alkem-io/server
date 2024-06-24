import { PubSubEngine } from 'graphql-subscriptions';
import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_WHITEBOARD_SAVED,
} from '@src/common/constants';
import { SubscriptionType } from '@common/enums/subscription.type';

@Injectable()
export class SubscriptionReadService {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private activityCreatedSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_ROOM_EVENT)
    private roomEventsSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_WHITEBOARD_SAVED)
    private whiteboardSavedSubscription: PubSubEngine
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

  public subscribeToWhiteboardSavedEvents() {
    return this.whiteboardSavedSubscription.asyncIterator(
      SubscriptionType.WHITEBOARD_SAVED
    );
  }
}

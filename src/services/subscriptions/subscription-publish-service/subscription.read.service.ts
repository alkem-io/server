import { PubSubEngine } from 'graphql-subscriptions';
import { Inject, Injectable } from '@nestjs/common';
import { SUBSCRIPTION_ACTIVITY_CREATED } from '@src/common/constants';
import { SubscriptionType } from '@common/enums/subscription.type';

@Injectable()
export class SubscriptionReadService {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private activityCreatedSubscription: PubSubEngine
  ) {}

  public subscribeToActivities() {
    return this.activityCreatedSubscription.asyncIterator(
      SubscriptionType.ACTIVITY_CREATED
    );
  }
}

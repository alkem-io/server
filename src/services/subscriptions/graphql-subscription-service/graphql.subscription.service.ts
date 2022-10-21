import { PubSubEngine } from 'graphql-subscriptions';
import { Inject, Injectable } from '@nestjs/common';
import { SUBSCRIPTION_ACTIVITY_CREATED } from '@src/common';
import { SubscriptionType } from '@common/enums/subscription.type';
import { IActivity } from '@platform/activity';
import { ActivityCreatedSubscriptionPayload } from './dto';

@Injectable()
export class GraphqlSubscriptionService {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private activityCreatedSubscription: PubSubEngine
  ) {}

  public activityCreated(collaborationID: string, activity: IActivity): void {
    const payload: ActivityCreatedSubscriptionPayload = {
      eventID: `activity-created-${Math.round(Math.random() * 100)}`,
      collaborationID,
      activity,
    };

    this.activityCreatedSubscription.publish(
      SubscriptionType.ACTIVITY_CREATED,
      payload
    );
  }
}

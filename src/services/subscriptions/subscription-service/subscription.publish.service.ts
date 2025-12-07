import { PubSubEngine } from 'graphql-subscriptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
  SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
} from '@src/common/constants';
import { SubscriptionType } from '@common/enums/subscription.type';
import { IActivity } from '@platform/activity';
import { IMessage } from '@domain/communication/message/message.interface';
import { MutationType } from '@common/enums/subscriptions';
import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';
import {
  ActivityCreatedSubscriptionPayload,
  RoomEventSubscriptionPayload,
  VirtualContributorUpdatedSubscriptionPayload,
  InAppNotificationCounterSubscriptionPayload,
} from './dto';
import { IRoom } from '@domain/communication/room/room.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { TypedPubSubEngine } from '@services/subscriptions/subscription-service/typed.pub.sub.engine';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';

@Injectable()
export class SubscriptionPublishService {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private activityCreatedSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_ROOM_EVENT)
    private roomEventsSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED)
    private virtualContributorUpdatedSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED)
    private inAppNotificationReceivedSubscription: TypedPubSubEngine<IInAppNotification>,
    @Inject(SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER)
    private inAppNotificationCounterSubscription: TypedPubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public publishActivity(
    collaborationID: string,
    activity: IActivity
  ): Promise<void> {
    const payload: ActivityCreatedSubscriptionPayload = {
      eventID: `activity-created-${randomInt()}`,
      collaborationID,
      activity,
    };

    return this.activityCreatedSubscription.publish(
      SubscriptionType.ACTIVITY_CREATED,
      payload
    );
  }

  public publishRoomEvent(
    room: IRoom,
    type: MutationType,
    data: IMessage | IMessageReaction,
    messageID?: string
  ): Promise<void> {
    const payload: RoomEventSubscriptionPayload = {
      eventID: `room-event-${randomInt()}`,
      roomID: room.id,
      room: room,
    };

    if (isMessage(data)) {
      payload.message = {
        type,
        data,
      };
    } else {
      payload.reaction = {
        type,
        messageID,
        data,
      };
    }

    this.logger.verbose?.(
      `Publishing room event: roomID=${room.id}, eventID=${payload.eventID}, type=${type}`,
      LogContext.SUBSCRIPTIONS
    );

    return this.roomEventsSubscription.publish(
      SubscriptionType.ROOM_EVENTS,
      payload
    );
  }

  public publishVirtualContributorUpdated(
    virtualContributor: IVirtualContributor
  ): void {
    const payload: VirtualContributorUpdatedSubscriptionPayload = {
      eventID: `virtual-contributor-updated${randomInt()}`,
      virtualContributor,
    };

    this.virtualContributorUpdatedSubscription.publish(
      SubscriptionType.VIRTUAL_CONTRIBUTOR_UPDATED,
      payload
    );

    this.logger.verbose?.(
      `VirtualContributorUpdated published. VC id: ${virtualContributor.id}`,
      LogContext.SUBSCRIPTION_PUBLISH
    );
  }

  public publishInAppNotificationReceived(notification: IInAppNotification) {
    return this.inAppNotificationReceivedSubscription.publish(
      SubscriptionType.IN_APP_NOTIFICATION_RECEIVED,
      {
        eventID: `in-app-notification-received-${randomInt()}`,
        notification,
      }
    );
  }

  public publishInAppNotificationCounter(receiverID: string, count: number) {
    const payload: InAppNotificationCounterSubscriptionPayload = {
      eventID: `in-app-notification-counter-${randomInt()}`,
      receiverID,
      count,
    };

    return this.inAppNotificationCounterSubscription.publish(
      SubscriptionType.IN_APP_NOTIFICATION_COUNTER,
      payload
    );
  }
}

const randomInt = () => Math.round(Math.random() * 1000);

const isMessage = (
  messageOrReaction: unknown
): messageOrReaction is IMessage => {
  return (messageOrReaction as IMessage)?.message != undefined;
};

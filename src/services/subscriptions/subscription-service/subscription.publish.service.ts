import { PubSubEngine } from 'graphql-subscriptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { SUBSCRIPTION_ACTIVITY_CREATED } from '@src/common/constants';
import { SubscriptionType } from '@common/enums/subscription.type';
import { IActivity } from '@platform/activity';
import { IMessage } from '@domain/communication/message/message.interface';
import { MutationType } from '@common/enums/subscriptions';
import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';
import {
  ActivityCreatedSubscriptionPayload,
  RoomEventSubscriptionPayload,
} from './dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

@Injectable()
export class SubscriptionPublishService {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private activityCreatedSubscription: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
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
    roomId: string,
    type: MutationType,
    data: IMessage | IMessageReaction,
    messageID?: string
  ): Promise<void> {
    const payload: RoomEventSubscriptionPayload = {
      eventID: `room-event-${randomInt()}`,
      roomID: roomId,
    };

    if (isMessage(data)) {
      payload.message = {
        type,
        data,
      };
    } else {
      if (!messageID) {
        return this.logger.error(
          'messageID needs to be provided for reaction message events',
          LogContext.SUBSCRIPTIONS
        );
      }

      payload.reaction = {
        type,
        messageID,
        data,
      };
    }

    return this.activityCreatedSubscription.publish(
      SubscriptionType.ROOM_EVENTS,
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

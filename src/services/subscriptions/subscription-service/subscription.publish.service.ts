import { PubSubEngine } from 'graphql-subscriptions';
import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_WHITEBOARD_SAVED,
} from '@src/common/constants';
import { SubscriptionType } from '@common/enums/subscription.type';
import { IActivity } from '@platform/activity';
import { IMessage } from '@domain/communication/message/message.interface';
import { MutationType } from '@common/enums/subscriptions';
import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';
import {
  ActivityCreatedSubscriptionPayload,
  RoomEventSubscriptionPayload,
  WhiteboardSavedSubscriptionPayload,
} from './dto';
import { Room } from '@domain/communication/room';

@Injectable()
export class SubscriptionPublishService {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private activityCreatedSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_ROOM_EVENT)
    private roomEventsSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_WHITEBOARD_SAVED)
    private whiteboardSavedSubscription: PubSubEngine
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
    messageID?: string,
    room?: Room
  ): Promise<void> {
    const payload: RoomEventSubscriptionPayload = {
      eventID: `room-event-${randomInt()}`,
      roomID: roomId,
      room: room || {},
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

    return this.roomEventsSubscription.publish(
      SubscriptionType.ROOM_EVENTS,
      payload
    );
  }

  public publishWhiteboardSaved(
    whiteboardId: string,
    updatedDate: Date
  ): Promise<void> {
    const payload: WhiteboardSavedSubscriptionPayload = {
      eventID: `whiteboard-saved-${randomInt()}`,
      whiteboardID: whiteboardId,
      updatedDate,
    };

    return this.whiteboardSavedSubscription.publish(
      SubscriptionType.WHITEBOARD_SAVED,
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

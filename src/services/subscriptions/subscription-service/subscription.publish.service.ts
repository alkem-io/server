import { PubSubEngine } from 'graphql-subscriptions';
import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
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
  VirtualContributorUpdatedSubscriptionPayload,
} from './dto';
import { IRoom } from '@domain/communication/room/room.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';

@Injectable()
export class SubscriptionPublishService {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private activityCreatedSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_ROOM_EVENT)
    private roomEventsSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_WHITEBOARD_SAVED)
    private whiteboardSavedSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED)
    private virtualContributorUpdatedSubscription: PubSubEngine
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

  public publishVirtualContributorUpdated(
    virtualContributor: IVirtualContributor
  ): Promise<void> {
    const payload: VirtualContributorUpdatedSubscriptionPayload = {
      eventID: `virtual-contributor-updated${randomInt()}`,
      virtualContributor,
    };

    return this.virtualContributorUpdatedSubscription.publish(
      SubscriptionType.VIRTUAL_CONTRIBUTOR_UPDATED,
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

import { IUser } from '@domain/community/user';
import { Inject } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { CommunicationMessageReceived } from '@services/platform/communication/communication.dto.message.received';
import { RoomInvitationReceived } from '@services/platform/communication/communication.dto.room.invitation.received';
import {
  COMMUNICATION_MESSAGE_RECEIVED,
  ROOM_INVITATION_RECEIVED,
} from '@services/platform/subscription/subscription.events';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { PubSub } from 'apollo-server-express';

@Resolver(() => IUser)
export class UserResolverSubscriptions {
  constructor(@Inject(PUB_SUB) private pubSub: PubSub) {}

  @Subscription(() => CommunicationMessageReceived, {
    resolve: value => {
      return value;
    },
  })
  messageReceived() {
    return this.pubSub.asyncIterator(COMMUNICATION_MESSAGE_RECEIVED);
  }

  @Subscription(() => RoomInvitationReceived, {
    resolve: value => {
      return value;
    },
  })
  roomNotificationReceived() {
    return this.pubSub.asyncIterator(ROOM_INVITATION_RECEIVED);
  }
}

import { Inject } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { CommunicationMessageReceived } from '@services/platform/communication/communication.dto.message.received';
import { RoomInvitationReceived } from '@services/platform/communication/communication.dto.room.invitation.received';
import {
  COMMUNICATION_MESSAGE_RECEIVED,
  MATRIX_ROOM_JOINED,
} from '@services/platform/subscription/subscription.events';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { UserService } from './user.service';
import { PubSubEngine } from 'graphql-subscriptions';

@Resolver()
export class UserResolverSubscriptions {
  constructor(
    @Inject(PUB_SUB) private pubSub: PubSubEngine,
    private userService: UserService
  ) {}

  @Subscription(() => CommunicationMessageReceived, {
    async resolve(
      this: UserResolverSubscriptions,
      value: CommunicationMessageReceived
    ) {
      const user = await this.userService.getUserByEmail(value.message.sender);
      if (!user) {
        return new CommunicationMessageReceived();
      }

      value.message.sender = user?.id;
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
    return this.pubSub.asyncIterator(MATRIX_ROOM_JOINED);
  }
}

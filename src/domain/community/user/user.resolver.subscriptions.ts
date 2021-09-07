import { Inject } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { CommunicationMessageReceived } from '@services/platform/communication/communication.dto.message.received';
import { RoomInvitationReceived } from '@services/platform/communication/communication.dto.room.invitation.received';
import {
  COMMUNICATION_MESSAGE_RECEIVED,
  MATRIX_ROOM_JOINED,
} from '@services/platform/subscription/subscription.events';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { PubSub } from 'apollo-server-express';
import { UserService } from './user.service';

@Resolver()
export class UserResolverSubscriptions {
  constructor(
    @Inject(PUB_SUB) private pubSub: PubSub,
    private userService: UserService
  ) {}

  // The guard does not operate correctly when the connection is established through a WS
  // See app.module.ts for more information
  // @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationMessageReceived, {
    description:
      'Receive new messages for rooms the currently authenticated User is a member of.',
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
    async filter(
      this: UserResolverSubscriptions,
      payload: CommunicationMessageReceived,
      _: any,
      context: any
    ) {
      return payload.userEmail === context.req?.user?.email;
    },
  })
  messageReceived() {
    return this.pubSub.asyncIterator(COMMUNICATION_MESSAGE_RECEIVED);
  }

  @Subscription(() => RoomInvitationReceived, {
    description: 'Receive new room invitations.',
    resolve: value => {
      return value;
    },
  })
  roomNotificationReceived() {
    return this.pubSub.asyncIterator(MATRIX_ROOM_JOINED);
  }
}

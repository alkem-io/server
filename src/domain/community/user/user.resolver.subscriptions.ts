import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { SUBSCRIPTION_PUB_SUB } from '@core/microservices/microservices.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from './user.service';
import { PubSubEngine } from 'graphql-subscriptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CommunicationMessageReceived } from './dto/user.dto.communication.message.received';
import { RoomInvitationReceived } from './dto/user.dto.communication.room.invitation.received';
import { CommunicationEventMessageReceived } from '@domain/common/communication/communication.dto.event.message.received';

@Resolver()
export class UserResolverSubscriptions {
  constructor(
    private userService: UserService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_PUB_SUB) private pubSub: PubSubEngine
  ) {}

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationMessageReceived, {
    description:
      'Receive new messages for rooms the currently authenticated User is a member of.',
    async resolve(
      this: UserResolverSubscriptions,
      value: CommunicationEventMessageReceived
    ) {
      // Convert from matrix IDs to alkemio User IDs
      const sender = await this.userService.getUserByCommunicationIdOrFail(
        value.message.sender
      );
      const receiver = await this.userService.getUserByCommunicationIdOrFail(
        value.communicationID
      );
      value.message.sender = sender.id;

      const result = {
        roomId: value.roomId,
        roomName: value.roomName,
        message: value.message,
        userID: receiver.id,
        communityId: value.communityId,
      };
      return result;
    },
    async filter(
      this: UserResolverSubscriptions,
      payload: CommunicationEventMessageReceived,
      _: any,
      context: any
    ) {
      // Note: by going through the passport authentication mechanism the "user" property
      // the request will contain the AgentInfo that was authenticated.
      return payload.communicationID === context.req?.user?.communicationID;
    },
  })
  async messageReceived(@CurrentUser() agentInfo: AgentInfo) {
    const user = await this.userService.getUserOrFail(agentInfo.userID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.UPDATE,
      `subscribe to user message received events: ${user.displayName}`
    );
    return this.pubSub.asyncIterator(
      SubscriptionType.COMMUNICATION_MESSAGE_RECEIVED
    );
  }

  @Subscription(() => RoomInvitationReceived, {
    description: 'Receive new room invitations.',
    resolve: value => {
      return value;
    },
  })
  roomNotificationReceived() {
    return this.pubSub.asyncIterator(
      SubscriptionType.COMMUNICATION_ROOM_JOINED
    );
  }
}

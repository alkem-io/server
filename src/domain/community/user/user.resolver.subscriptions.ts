import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { AuthorizationEngineService } from '@services/platform/authorization-engine/authorization-engine.service';
import { CommunicationMessageReceived } from '@services/platform/communication/communication.dto.message.received';
import { RoomInvitationReceived } from '@services/platform/communication/communication.dto.room.invitation.received';
import {
  COMMUNICATION_MESSAGE_RECEIVED,
  MATRIX_ROOM_JOINED,
} from '@services/platform/subscription/subscription.events';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { PubSub } from 'apollo-server-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from './user.service';

@Resolver()
export class UserResolverSubscriptions {
  constructor(
    @Inject(PUB_SUB) private pubSub: PubSub,
    private userService: UserService,
    private authorizationEngine: AuthorizationEngineService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationMessageReceived, {
    description:
      'Receive new messages for rooms the currently authenticated User is a member of.',
    async resolve(
      this: UserResolverSubscriptions,
      value: CommunicationMessageReceived
    ) {
      // Use this to update the sender identifer
      // Todo: should not be doing any heavy work during the resolving - the user should be cached
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
      // Note: by going through the passport authentication mechanism the "user" property on
      // the request will contain the AgentInfo that was authenticated.
      return payload.userEmail === context.req?.user?.email;
    },
  })
  async messageReceived(@CurrentUser() agentInfo: AgentInfo) {
    const user = await this.userService.getUserOrFail(agentInfo.userID);
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.READ,
      `subscribe to user message received events: ${user.displayName}`
    );
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

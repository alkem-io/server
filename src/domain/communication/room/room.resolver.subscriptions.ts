import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_ROOM_MESSAGE } from '@common/constants/providers';
import { TypedSubscription } from '@src/common/decorators';
import { RoomService } from './room.service';
import { RoomMessageReceivedPayload } from './dto/room.subscription.message.received.payload';
import { RoomMessageReceivedArgs } from './dto/room.subscription.message.received.args';
import { RoomMessageReceived } from './dto/room.subscription.dto.event.message.received';

@Resolver()
export class RoomResolverSubscriptions {
  constructor(
    private authorizationService: AuthorizationService,
    private roomService: RoomService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_ROOM_MESSAGE)
    private subscriptionRoomMessage: PubSubEngine
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<RoomMessageReceivedPayload, RoomMessageReceivedArgs>(
    () => RoomMessageReceived,
    {
      description: 'Receive new Discussion messages',
      async resolve(this: RoomResolverSubscriptions, payload, args, context) {
        const agentInfo = context.req?.user;
        const logMsgPrefix = `[User (${agentInfo.email}) Room Msg] - `;
        this.logger.verbose?.(
          `${logMsgPrefix} Sending out event: ${payload.roomID} `,
          LogContext.SUBSCRIPTIONS
        );
        return payload;
      },
      async filter(
        this: RoomResolverSubscriptions,
        payload,
        variables,
        context
      ) {
        const agentInfo = context.req?.user;
        const isMatch = variables.roomID === payload.roomID;

        this.logger.verbose?.(
          `[User (${agentInfo.email}) Room Msg] - Filtering event id '${payload.eventID}' - match? ${isMatch}`,
          LogContext.SUBSCRIPTIONS
        );

        return isMatch;
      },
    }
  )
  async roomMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: false }) { roomID }: RoomMessageReceivedArgs
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Room Msg] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following room: ${roomID}`,
      LogContext.SUBSCRIPTIONS
    );

    const room = await this.roomService.getRoomOrFail(roomID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.READ,
      `subscription to room messages on: ${room.id}`
    );

    return this.subscriptionRoomMessage.asyncIterator(
      SubscriptionType.COMMUNICATION_ROOM_MESSAGE_RECEIVED
    );
  }
}

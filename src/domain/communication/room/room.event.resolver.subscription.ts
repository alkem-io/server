import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_ROOM_MESSAGE } from '@common/constants/providers';
import { TypedSubscription } from '@src/common/decorators';
import {
  RoomMessageEventSubscriptionArgs,
} from '@domain/communication/room/dto/subscription';
import { RoomMessageReceivedArgs } from '@domain/communication/room/dto/room.subscription.message.received.args';
import { RoomService } from './room.service';
import { RoomMessageEventSubscriptionResult } from '@domain/communication/room/dto/subscription/room.message.event.subscription.result';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { RoomEventSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';

@Resolver()
export class RoomEventResolverSubscription {
  constructor(
    private authorizationService: AuthorizationService,
    private roomService: RoomService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_ROOM_MESSAGE)
    private subscriptionRoomMessage: PubSubEngine,
    private subscriptionService: SubscriptionReadService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<
    RoomEventSubscriptionPayload,
    RoomMessageEventSubscriptionArgs
  >(() => RoomMessageEventSubscriptionResult, {
    description: 'Receive Room event',
    async resolve(this: RoomEventResolverSubscription, payload, args, context) {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Room Msg] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} Sending out event: ${payload.roomID} `,
        LogContext.SUBSCRIPTIONS
      );
      return payload;
    },
    async filter(
      this: RoomEventResolverSubscription,
      payload,
      variables,
      context
    ) {
      const agentInfo = context.req?.user;
      const isMatch = variables.roomID === payload.roomID;

      this.logger.verbose?.(
        `[User (${agentInfo.email}) Room Events] - Filtering event id '${payload.eventID}' - match=${isMatch}`,
        LogContext.SUBSCRIPTIONS
      );

      return isMatch;
    },
  })
  async roomEvents(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: false }) { roomID }: RoomMessageReceivedArgs
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Room Events] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following room: ${roomID}`,
      LogContext.SUBSCRIPTIONS
    );

    const room = await this.roomService.getRoomOrFail(roomID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.READ,
      `subscription to room events on: ${room.id}`
    );

    return this.subscriptionService.subscribeToRoomEvents();
  }
}

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  RoomEventSubscriptionArgs,
  RoomEventSubscriptionResult,
} from '@domain/communication/room/dto/subscription';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { RoomEventSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { InstrumentResolver } from '@src/apm/decorators';
import { TypedSubscription } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoomService } from './room.service';

@InstrumentResolver()
@Resolver()
export class RoomEventResolverSubscription {
  constructor(
    private authorizationService: AuthorizationService,
    private roomService: RoomService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private subscriptionService: SubscriptionReadService
  ) {}

  @TypedSubscription<RoomEventSubscriptionPayload, RoomEventSubscriptionArgs>(
    () => RoomEventSubscriptionResult,
    {
      description: 'Receive Room event',
      async resolve(
        this: RoomEventResolverSubscription,
        payload,
        _args,
        context
      ) {
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
    }
  )
  async roomEvents(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: false }) { roomID }: RoomEventSubscriptionArgs
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Room Events] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following room: ${roomID}`,
      LogContext.SUBSCRIPTIONS
    );

    const room = await this.roomService.getRoomOrFail(roomID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.READ,
      `subscription to room events on: ${room.id}`
    );

    return this.subscriptionService.subscribeToRoomEvents();
  }
}

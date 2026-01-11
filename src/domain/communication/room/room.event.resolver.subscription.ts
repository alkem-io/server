import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { ActorContext } from '@core/actor-context';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TypedSubscription } from '@src/common/decorators';
import {
  RoomEventSubscriptionArgs,
  RoomEventSubscriptionResult,
} from '@domain/communication/room/dto/subscription';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { RoomEventSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { RoomService } from './room.service';
import { InstrumentResolver } from '@src/apm/decorators';

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
        const actorContext = context.req?.user;
        const logMsgPrefix = `[User (${actorContext.actorId}) Room Msg] - `;
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
        const actorContext = context.req?.user;
        const isMatch = variables.roomID === payload.roomID;

        this.logger.verbose?.(
          `[User (${actorContext.actorId}) Room Events] - Filtering event id '${payload.eventID}' - match=${isMatch}`,
          LogContext.SUBSCRIPTIONS
        );

        return isMatch;
      },
    }
  )
  async roomEvents(
    @CurrentActor() actorContext: ActorContext,
    @Args({ nullable: false }) { roomID }: RoomEventSubscriptionArgs
  ) {
    const logMsgPrefix = `[User (${actorContext.actorId}) Room Events] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following room: ${roomID}`,
      LogContext.SUBSCRIPTIONS
    );

    const room = await this.roomService.getRoomOrFail(roomID);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      room.authorization,
      AuthorizationPrivilege.READ,
      `subscription to room events on: ${room.id}`
    );

    return this.subscriptionService.subscribeToRoomEvents();
  }
}

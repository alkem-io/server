import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { IPushSubscription } from '@domain/push-subscription/push.subscription.interface';
import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Query, Resolver } from '@nestjs/graphql';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver()
export class PushSubscriptionResolverQueries {
  constructor(
    private pushSubscriptionService: PushSubscriptionService,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Query(() => String, {
    nullable: true,
    description:
      'Returns the VAPID public key needed by clients to subscribe to push notifications. Returns null if push notifications are not enabled on this server.',
  })
  @Profiling.api
  async vapidPublicKey(): Promise<string | null> {
    const pushEnabled = this.configService.get<boolean>(
      'notifications.push.enabled' as any
    );
    if (!pushEnabled) {
      return null;
    }
    return this.configService.get<string>(
      'notifications.push.vapid.public_key' as any
    );
  }

  @Query(() => [IPushSubscription], {
    nullable: false,
    description:
      "Returns the current user's push notification subscriptions (active and disabled). Requires authentication.",
  })
  @Profiling.api
  async myPushSubscriptions(
    @CurrentActor() actorContext: ActorContext
  ): Promise<IPushSubscription[]> {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'Authentication required to view push subscriptions',
        LogContext.PUSH_NOTIFICATION
      );
    }
    return this.pushSubscriptionService.getUserSubscriptions(
      actorContext.actorID
    );
  }
}

import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { DevicePushTokenService } from '@domain/device-push-token/device.push.token.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { RegisterDevicePushTokenInput } from './dto/device.push.token.dto.register.input';
import { UnregisterDevicePushTokenInput } from './dto/device.push.token.dto.unregister.input';

@Resolver()
export class DevicePushTokenResolverMutations {
  constructor(private devicePushTokenService: DevicePushTokenService) {}

  @Mutation(() => Boolean, {
    description:
      'Bind a native device push token (FCM on Android, APNs on iOS) to the current user. If the token is already bound to another user, it is rebound to the caller.',
  })
  @Profiling.api
  async registerDevicePushToken(
    @CurrentActor() actorContext: ActorContext,
    @Args('registrationData')
    registrationData: RegisterDevicePushTokenInput
  ): Promise<boolean> {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'Authentication required to register a device push token',
        LogContext.PUSH_NOTIFICATION
      );
    }
    await this.devicePushTokenService.register(
      actorContext.actorID,
      registrationData
    );
    return true;
  }

  @Mutation(() => Boolean, {
    description:
      'Unbind a native device push token from the current user. Unknown tokens, and tokens bound to another user, are no-ops.',
  })
  @Profiling.api
  async unregisterDevicePushToken(
    @CurrentActor() actorContext: ActorContext,
    @Args('registrationData')
    registrationData: UnregisterDevicePushTokenInput
  ): Promise<boolean> {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'Authentication required to unregister a device push token',
        LogContext.PUSH_NOTIFICATION
      );
    }
    await this.devicePushTokenService.unregister(
      actorContext.actorID,
      registrationData.token
    );
    return true;
  }
}

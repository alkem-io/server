import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadPlatformUserProfileRemoved } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.user.profile.removed';

@Resolver(() => InAppNotificationPayloadPlatformUserProfileRemoved)
export class InAppNotificationPayloadPlatformUserProfileRemovedResolverFields {
  @ResolveField(() => String, {
    nullable: false,
    description: 'The display name of the User that was removed.',
  })
  public userDisplayName(
    @Parent()
    payload: InAppNotificationPayloadPlatformUserProfileRemoved
  ): string {
    return payload.userDisplayName;
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The email of the User that was removed.',
  })
  public userEmail(
    @Parent()
    payload: InAppNotificationPayloadPlatformUserProfileRemoved
  ): string {
    return payload.userEmail;
  }
}

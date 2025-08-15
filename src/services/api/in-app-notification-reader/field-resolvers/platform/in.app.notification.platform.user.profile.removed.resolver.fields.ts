import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadPlatformUserProfileRemoved } from '@platform/in-app-notification/dto/payload/platform/notification.in.app.payload.platform.user.profile.removed';

@Resolver(() => InAppNotificationPayloadPlatformUserProfileRemoved)
export class InAppNotificationPlatformUserProfileRemovedResolverFields {
  @ResolveField(() => String, {
    nullable: true,
    description: 'The display name of the User that was removed.',
  })
  public user(
    @Parent()
    payload: InAppNotificationPayloadPlatformUserProfileRemoved
  ): string {
    return payload.userDisplayName;
  }
}

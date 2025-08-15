import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPlatformUserProfileRemovedPayload } from '@platform/in-app-notification/dto/platform/notification.in.app.platform.user.profile.removed.payload';

@ObjectType('InAppNotificationPlatformUserProfileRemoved', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryPlatformUserProfileRemoved extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.PLATFORM_USER_PROFILE_REMOVED;
  declare payload: InAppNotificationPlatformUserProfileRemovedPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  user?: IContributor;
}

import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPlatformUserProfileCreatedAdminPayload } from '@services/adapters/notification-in-app-adapter/dto/platform/notification.in.app.platform.user.profile.created.admin.payload';

@ObjectType('InAppNotificationPlatformUserProfileCreatedAdmin', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryPlatformUserProfileCreatedAdmin extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.PLATFORM_USER_PROFILE_CREATED_ADMIN;
  declare payload: InAppNotificationPlatformUserProfileCreatedAdminPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  user?: IContributor;
}

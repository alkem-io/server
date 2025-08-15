import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPlatformGlobalRoleChangePayload } from '@platform/in-app-notification/dto/platform/notification.in.app.platform.global.role.change.payload';

@ObjectType('InAppNotificationPlatformGlobalRoleChange', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryPlatformGlobalRoleChange extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.PLATFORM_GLOBAL_ROLE_CHANGE;
  declare payload: InAppNotificationPlatformGlobalRoleChangePayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  user?: IContributor;
  role?: string;
}

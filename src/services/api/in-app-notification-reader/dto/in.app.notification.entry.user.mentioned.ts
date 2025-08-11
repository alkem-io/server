import { ObjectType } from '@nestjs/graphql';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { IInAppNotificationEntryBase } from './in.app.notification.entry.base';
import { IInAppNotificationEntry } from './in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationContributorMentionedPayload } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.contributor.mentioned.payload';

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryUserMentioned extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.USER_MENTION;
  declare payload: InAppNotificationContributorMentionedPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  comment!: string;
  commentUrl!: string;
}

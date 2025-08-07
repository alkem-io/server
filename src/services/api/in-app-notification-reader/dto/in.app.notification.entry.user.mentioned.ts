import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationContributorMentionedPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { IInAppNotificationEntryBase } from './in.app.notification.entry.base';
import { IInAppNotificationEntry } from './in.app.notification.entry.interface';

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryUserMentioned extends IInAppNotificationEntryBase {
  declare type: NotificationEventType.COMMUNICATION_USER_MENTION;
  declare payload: InAppNotificationContributorMentionedPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  comment!: string;
  commentUrl!: string;
}

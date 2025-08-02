import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationContributorMentionedPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { IInAppNotification } from '../../in-app-notification/in.app.notification.interface';
import { IInAppNotificationEntryBase } from './in.app.notification.base';

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => IInAppNotification,
})
export class InAppNotificationUserMentioned extends IInAppNotificationEntryBase {
  declare type: NotificationEventType.COMMUNICATION_USER_MENTION;
  declare payload: InAppNotificationContributorMentionedPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  comment!: string;
  commentUrl!: string;
}

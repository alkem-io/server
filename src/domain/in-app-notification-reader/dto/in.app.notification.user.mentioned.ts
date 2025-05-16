import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationContributorMentionedPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationBase } from '@domain/in-app-notification-reader/dto/in.app.notification.base';

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => InAppNotification,
})
export class InAppNotificationUserMentioned extends InAppNotificationBase() {
  declare type: NotificationEventType.COMMUNICATION_USER_MENTION;
  declare payload: InAppNotificationContributorMentionedPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  comment!: string;
  commentUrl!: string;
}

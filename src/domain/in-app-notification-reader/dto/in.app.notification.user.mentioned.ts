import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationContributorMentionedPayload,
  NotificationEventType,
  InAppNotificationCategory,
} from '@alkemio/notifications-lib';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';
import { InAppNotificationBase } from '@domain/in-app-notification-reader/dto/in.app.notification.base';

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => InAppNotification,
})
export class InAppNotificationUserMentioned extends InAppNotificationBase() {
  type!: NotificationEventType.COMMUNICATION_USER_MENTION;
  payload!: InAppNotificationContributorMentionedPayload;
  // fields resolved by a concrete resolver
  contributorType?: CommunityContributorType;
  comment?: string;
  commentUrl?: string;
}

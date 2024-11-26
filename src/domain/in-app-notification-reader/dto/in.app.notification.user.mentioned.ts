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

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => InAppNotification,
})
export class InAppNotificationUserMentioned implements InAppNotification {
  type!: NotificationEventType.COMMUNICATION_USER_MENTION;
  // fields resolved by a concrete resolver
  contributorType?: CommunityContributorType;
  comment?: string;
  commentUrl?: string;
  // inherited, resolved by the interface resolvers
  id!: string;
  category!: InAppNotificationCategory;
  receiver!: IContributor;
  triggeredBy?: IContributor;
  state!: InAppNotificationState;
  triggeredAt!: Date;
  payload!: InAppNotificationContributorMentionedPayload;
}

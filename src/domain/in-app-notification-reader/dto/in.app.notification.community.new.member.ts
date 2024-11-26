import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationCommunityNewMemberPayload,
  NotificationEventType,
  InAppNotificationCategory,
} from '@alkemio/notifications-lib';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';
import { InAppNotification } from '../in.app.notification.interface';

@ObjectType('InAppNotificationCommunityNewMember', {
  implements: () => InAppNotification,
})
export class InAppNotificationCommunityNewMember implements InAppNotification {
  type!: NotificationEventType.COMMUNITY_NEW_MEMBER;
  // fields resolved by a concrete resolver
  contributorType?: CommunityContributorType;
  actor?: IContributor;
  space?: ISpace;
  // inherited, resolved by the interface resolvers
  id!: string;
  category!: InAppNotificationCategory;
  receiver!: IContributor;
  state!: InAppNotificationState;
  triggeredAt!: Date;
  triggeredBy?: IContributor;
  payload!: InAppNotificationCommunityNewMemberPayload;
}

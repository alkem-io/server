import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationCommunityNewMemberPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationBase } from '@domain/in-app-notification-reader/dto/in.app.notification.base';

@ObjectType('InAppNotificationCommunityNewMember', {
  implements: () => InAppNotification,
})
export class InAppNotificationCommunityNewMember extends InAppNotificationBase() {
  type = NotificationEventType.COMMUNITY_NEW_MEMBER;
  payload!: InAppNotificationCommunityNewMemberPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  actor?: IContributor;
  space?: ISpace;
}

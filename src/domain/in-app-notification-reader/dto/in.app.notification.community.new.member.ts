import { ObjectType } from '@nestjs/graphql';
import {
  InAppNotificationCommunityNewMemberPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotification } from '../../in-app-notification/in.app.notification.interface';
import { IInAppNotificationEntryBase } from './in.app.notification.base';

@ObjectType('InAppNotificationCommunityNewMember', {
  implements: () => IInAppNotification,
})
export class InAppNotificationCommunityNewMember extends IInAppNotificationEntryBase {
  declare type: NotificationEventType.COMMUNITY_NEW_MEMBER;
  declare payload: InAppNotificationCommunityNewMemberPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  actor?: IContributor;
  space?: ISpace;
}

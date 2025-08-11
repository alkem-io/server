import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from './in.app.notification.entry.base';
import { IInAppNotificationEntry } from './in.app.notification.entry.interface';
import { InAppNotificationCommunityNewMemberPayload } from '@services/cluster/in-app-notification-receiver/dto/in.app.notification.receiver.community.new.member.payload';
import { NotificationEvent } from '@common/enums/notification.event';

@ObjectType('InAppNotificationCommunityNewMember', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryCommunityNewMember extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER;
  declare payload: InAppNotificationCommunityNewMemberPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  actor?: IContributor;
  space?: ISpace;
}

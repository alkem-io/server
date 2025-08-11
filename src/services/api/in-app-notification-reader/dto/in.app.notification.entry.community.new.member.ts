import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from './in.app.notification.entry.base';
import { IInAppNotificationEntry } from './in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationCommunityNewMemberPayload } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.community.new.member.payload';

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

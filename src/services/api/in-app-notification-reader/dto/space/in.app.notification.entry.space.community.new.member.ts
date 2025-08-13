import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCommunityNewMemberPayload } from '@services/adapters/notification-in-app-adapter/dto/space/notification.in.app.space.community.new.member.payload';

@ObjectType('InAppNotificationSpaceCommunityNewMember', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCommunityNewMember extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER;
  declare payload: InAppNotificationSpaceCommunityNewMemberPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  contributor?: IContributor;
  space?: ISpace;
}

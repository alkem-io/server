import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCommunityNewMemberAdminPayload } from '@platform/in-app-notification/dto/space/notification.in.app.space.community.new.member.admin.payload';

@ObjectType('InAppNotificationSpaceCommunityNewMemberAdmin', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCommunityNewMemberAdmin extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN;
  declare payload: InAppNotificationSpaceCommunityNewMemberAdminPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  contributor?: IContributor;
  space?: ISpace;
}

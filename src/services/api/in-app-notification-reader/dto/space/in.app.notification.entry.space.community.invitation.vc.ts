import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCommunityInvitationVcPayload } from '@services/adapters/notification-in-app-adapter/dto/space/notification.in.app.space.community.invitation.vc.payload';

@ObjectType('InAppNotificationSpaceCommunityInvitationVc', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCommunityInvitationVc extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COMMUNITY_INVITATION_VC;
  declare payload: InAppNotificationSpaceCommunityInvitationVcPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
}

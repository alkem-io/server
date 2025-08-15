import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationSpaceCommunityApplicationAdminPayload } from '@platform/in-app-notification/dto/space/notification.in.app.space.community.application.admin.payload';

@ObjectType('InAppNotificationSpaceCommunityApplicationAdmin', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntrySpaceCommunityApplicationAdmin extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.SPACE_COMMUNITY_APPLICATION_ADMIN;
  declare payload: InAppNotificationSpaceCommunityApplicationAdminPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  space?: ISpace;
}

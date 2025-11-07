import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';

@ObjectType('InAppNotificationPayloadSpaceCommunityContributor', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityContributor extends InAppNotificationPayloadSpaceBase {
  contributorID!: string;
  contributorType!: RoleSetContributorType;
  declare type: NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR;
}

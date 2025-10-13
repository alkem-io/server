import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@ObjectType('InAppNotificationPayloadSpaceCommunityContributor', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityContributor extends InAppNotificationPayloadSpaceBase {
  contributorID!: string;
  declare type: NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR;
}

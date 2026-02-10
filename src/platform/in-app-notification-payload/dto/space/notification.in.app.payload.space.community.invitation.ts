import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';

@ObjectType('InAppNotificationPayloadSpaceCommunityInvitation', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityInvitation extends InAppNotificationPayloadSpaceBase {
  invitationID!: string;
  declare type: NotificationEventPayload.SPACE_COMMUNITY_INVITATION;
}

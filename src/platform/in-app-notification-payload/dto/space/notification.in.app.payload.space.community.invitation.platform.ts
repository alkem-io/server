import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@ObjectType('InAppNotificationPayloadSpaceCommunityInvitationPlatform', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityInvitationPlatform extends InAppNotificationPayloadSpaceBase {
  platformInvitationID!: string;
  declare type: NotificationEventPayload.SPACE_COMMUNITY_INVITATION_USER_PLATFORM;
}

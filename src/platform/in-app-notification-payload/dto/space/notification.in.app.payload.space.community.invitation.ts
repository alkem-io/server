import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadSpaceCommunityInvitation', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityInvitation extends InAppNotificationPayloadSpace {
  invitationID!: string;
}

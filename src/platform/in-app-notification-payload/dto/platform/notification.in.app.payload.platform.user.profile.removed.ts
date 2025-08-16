import { InAppNotificationPayload } from '../../in.app.notification.payload.base';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayloadPlatformUserProfileRemoved', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadPlatformUserProfileRemoved extends InAppNotificationPayload {
  userDisplayName!: string;
  userEmail!: string;
}

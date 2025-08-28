import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { InAppNotificationPayloadPlatform } from './notification.in.app.payload.platform.base';
@ObjectType('InAppNotificationPayloadPlatformUserProfileRemoved', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadPlatformUserProfileRemoved extends InAppNotificationPayloadPlatform {
  userDisplayName!: string;
  userEmail!: string;
}

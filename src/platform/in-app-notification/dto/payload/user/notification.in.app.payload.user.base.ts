import { InAppNotificationPayload } from '../in.app.notification.payload.base';
import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayloadPlatformUser', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadUser extends InAppNotificationPayload {
  userID!: string;
}

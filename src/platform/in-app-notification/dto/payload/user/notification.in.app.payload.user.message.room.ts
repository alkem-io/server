import { InAppNotificationPayloadUser } from './notification.in.app.payload.user.base';
import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayloadPlatformUserMessageRoom', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadUserMessageRoom extends InAppNotificationPayloadUser {
  messageID!: string;
  roomID!: string;
}

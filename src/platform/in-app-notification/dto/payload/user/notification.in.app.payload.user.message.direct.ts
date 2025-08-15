import { InAppNotificationPayloadUser } from './notification.in.app.payload.user.base';
import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayloadPlatformUserMessageDirect', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadUserMessageDirect extends InAppNotificationPayloadUser {
  message!: string;
}

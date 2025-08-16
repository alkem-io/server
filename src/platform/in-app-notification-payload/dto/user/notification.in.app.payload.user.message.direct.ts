import { InAppNotificationPayloadUser } from './notification.in.app.payload.user.base';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayloadUserMessageDirect', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadUserMessageDirect extends InAppNotificationPayloadUser {
  message!: string;
}

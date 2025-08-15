import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';
import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayloadSpaceMessageDirect', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunicationMessageDirect extends InAppNotificationPayloadSpace {
  message!: string;
}

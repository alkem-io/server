import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadSpaceApplication', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceApplication extends InAppNotificationPayloadSpace {
  applicationID!: string;
}

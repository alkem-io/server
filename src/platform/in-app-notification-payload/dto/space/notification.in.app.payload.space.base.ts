import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';

import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadSpace', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpace extends IInAppNotificationPayload {
  spaceID!: string;
}

import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';
import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayloadSpaceContributor', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceContributor extends InAppNotificationPayloadSpace {
  contributorID!: string;
}

import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import {
  InAppNotificationPayloadSpaceBase,
} from './notification.in.app.payload.space.base';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadSpaceCommunityApplicationDeclined', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityApplicationDeclined extends InAppNotificationPayloadSpaceBase {}

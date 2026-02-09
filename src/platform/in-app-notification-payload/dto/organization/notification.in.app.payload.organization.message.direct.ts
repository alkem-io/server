import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadOrganizationBase } from './notification.in.app.payload.organization.base';

@ObjectType('InAppNotificationPayloadOrganizationMessageDirect', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadOrganizationMessageDirect extends InAppNotificationPayloadOrganizationBase {
  message!: string;
  declare type: NotificationEventPayload.ORGANIZATION_MESSAGE_DIRECT;
}

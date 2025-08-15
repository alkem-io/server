import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { InAppNotificationPayloadOrganization } from './notification.in.app.payload.organization.base';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadOrganizationMessageDirect', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadOrganizationMessageDirect extends InAppNotificationPayloadOrganization {
  message!: string;
}

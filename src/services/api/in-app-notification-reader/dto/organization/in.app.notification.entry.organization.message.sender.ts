import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationOrganizationMessageSenderPayload } from '@platform/in-app-notification/dto/organization/notification.in.app.organization.message.sender.payload';

@ObjectType('InAppNotificationOrganizationMessageSender', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryOrganizationMessageSender extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.ORGANIZATION_MESSAGE_SENDER;
  declare payload: InAppNotificationOrganizationMessageSenderPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  organization?: IOrganization;
  message?: string;
}

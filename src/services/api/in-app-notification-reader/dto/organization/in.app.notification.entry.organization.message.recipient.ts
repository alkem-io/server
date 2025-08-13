import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationOrganizationMessageRecipientPayload } from '@services/adapters/notification-in-app-adapter/dto/organization/notification.in.app.organization.message.recipient.payload';

@ObjectType('InAppNotificationOrganizationMessageRecipient', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryOrganizationMessageRecipient extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT;
  declare payload: InAppNotificationOrganizationMessageRecipientPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  organization?: IOrganization;
  message?: string;
}

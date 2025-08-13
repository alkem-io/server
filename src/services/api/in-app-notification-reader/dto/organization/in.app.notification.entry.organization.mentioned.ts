import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationOrganizationMentionedPayload } from '@services/adapters/notification-in-app-adapter/dto/organization/notification.in.app.organization.mentioned.payload';

@ObjectType('InAppNotificationOrganizationMentioned', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryOrganizationMentioned extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.ORGANIZATION_MENTIONED;
  declare payload: InAppNotificationOrganizationMentionedPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  organization?: IOrganization;
  comment?: string;
  commentUrl?: string;
}

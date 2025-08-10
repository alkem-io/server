import { ObjectType } from '@nestjs/graphql';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { IInAppNotificationEntryBase } from './in.app.notification.entry.base';
import { IInAppNotificationEntry } from './in.app.notification.entry.interface';
import { InAppNotificationEventType } from '@common/enums/in.app.notification.event.type';
import { InAppNotificationContributorMentionedPayload } from '@services/cluster/in-app-notification-receiver/dto/in.app.notification.receiver.contributor.mentioned.payload';

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryUserMentioned extends IInAppNotificationEntryBase {
  declare type: InAppNotificationEventType.COMMUNICATION_USER_MENTION;
  declare payload: InAppNotificationContributorMentionedPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  comment!: string;
  commentUrl!: string;
}

import { ObjectType } from '@nestjs/graphql';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationUserMentionedPayload } from '@platform/in-app-notification/dto/user/notification.in.app.user.mentioned.payload';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryUserMentioned extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.USER_MENTION;
  declare payload: InAppNotificationUserMentionedPayload;
  // fields resolved by a concrete resolver
  contributorType!: RoleSetContributorType;
  comment!: string;
  commentUrl!: string;
}

import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPlatformForumDiscussionCreatedPayload } from '@platform/in-app-notification/dto/platform/notification.in.app.platform.forum.discussion.created.payload';

@ObjectType('InAppNotificationPlatformForumDiscussionCreated', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryPlatformForumDiscussionCreated extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED;
  declare payload: InAppNotificationPlatformForumDiscussionCreatedPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  discussion?: string;
}

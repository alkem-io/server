import { ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IInAppNotificationEntryBase } from '../in.app.notification.entry.base';
import { IInAppNotificationEntry } from '../in.app.notification.entry.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPlatformForumDiscussionCommentPayload } from '@platform/in-app-notification/dto/platform/notification.in.app.platform.forum.discussion.comment.payload';

@ObjectType('InAppNotificationPlatformForumDiscussionComment', {
  implements: () => IInAppNotificationEntry,
})
export class InAppNotificationEntryPlatformForumDiscussionComment extends IInAppNotificationEntryBase {
  declare type: NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT;
  declare payload: InAppNotificationPlatformForumDiscussionCommentPayload;
  // fields resolved by a concrete resolver
  contributor?: IContributor;
  discussion?: string;
  comment?: string;
}

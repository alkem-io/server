import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadPlatformForumDiscussionComment } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.forum.discussion.comment';

@Resolver(() => InAppNotificationPayloadPlatformForumDiscussionComment)
export class InAppNotificationPlatformForumDiscussionCommentResolverFields {
  @ResolveField(() => String, {
    nullable: true,
    description: 'The discussion ID.',
  })
  public discussion(
    @Parent()
    payload: InAppNotificationPayloadPlatformForumDiscussionComment
  ): string {
    return payload.discussionID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The comment ID.',
  })
  public comment(
    @Parent()
    payload: InAppNotificationPayloadPlatformForumDiscussionComment
  ): string {
    return payload.commentID;
  }
}

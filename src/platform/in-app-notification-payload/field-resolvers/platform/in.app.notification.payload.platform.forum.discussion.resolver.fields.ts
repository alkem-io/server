import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadPlatformForumDiscussion } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.forum.discussion';

@Resolver(() => InAppNotificationPayloadPlatformForumDiscussion)
export class InAppNotificationPayloadPlatformForumDiscussionResolverFields {
  @ResolveField(() => String, {
    nullable: false,
    description: 'The discussion ID.',
  })
  public discussion(
    @Parent()
    payload: InAppNotificationPayloadPlatformForumDiscussion
  ): string {
    return payload.discussionID;
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The comment ID.',
  })
  public comment(
    @Parent()
    payload: InAppNotificationPayloadPlatformForumDiscussion
  ): string {
    return payload.commentID || '';
  }
}

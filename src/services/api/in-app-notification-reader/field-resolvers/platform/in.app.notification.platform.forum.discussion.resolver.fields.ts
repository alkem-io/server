import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadPlatformForumDiscussion } from '@platform/in-app-notification/dto/payload/platform/notification.in.app.payload.platform.forum.discussion';

@Resolver(() => InAppNotificationPayloadPlatformForumDiscussion)
export class InAppNotificationPlatformForumDiscussionCreatedResolverFields {
  @ResolveField(() => String, {
    nullable: true,
    description: 'The discussion ID.',
  })
  public discussion(
    @Parent()
    payload: InAppNotificationPayloadPlatformForumDiscussion
  ): string {
    return payload.discussionID;
  }
}

import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationPayloadPlatformForumDiscussionComment } from '../../dto/platform/in.app.notification.entry.platform.forum.discussion.comment';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationPayloadPlatformForumDiscussionComment)
export class InAppNotificationPlatformForumDiscussionCommentResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that created the comment.',
  })
  public contributor(
    @Parent()
    payload: InAppNotificationPayloadPlatformForumDiscussionComment,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

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

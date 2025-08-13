import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationEntryPlatformForumDiscussionCreated } from '../../dto/platform/in.app.notification.entry.platform.forum.discussion.created';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationEntryPlatformForumDiscussionCreated)
export class InAppNotificationPlatformForumDiscussionCreatedResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that created the discussion.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntryPlatformForumDiscussionCreated,
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
    { payload }: InAppNotificationEntryPlatformForumDiscussionCreated
  ): string {
    return payload.discussionID;
  }
}

import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotificationEntrySpaceCollaborationPostCommentCreated } from '../../dto/space/in.app.notification.entry.space.collaboration.post.comment.created';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationEntrySpaceCollaborationPostCommentCreated)
export class InAppNotificationSpaceCollaborationPostCommentCreatedResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that created the comment.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationPostCommentCreated,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the comment was created.',
  })
  public space(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationPostCommentCreated,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The post ID.',
  })
  public post(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationPostCommentCreated
  ): string {
    return payload.postID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The comment ID.',
  })
  public comment(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationPostCommentCreated
  ): string {
    return payload.message.messageID;
  }
}

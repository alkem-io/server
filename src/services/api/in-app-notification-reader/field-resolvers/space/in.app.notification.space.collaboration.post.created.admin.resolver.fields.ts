import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotificationEntrySpaceCollaborationPostCreatedAdmin } from '../../dto/space/in.app.notification.entry.space.collaboration.post.created.admin';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationEntrySpaceCollaborationPostCreatedAdmin)
export class InAppNotificationSpaceCollaborationPostCreatedAdminResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that created the post.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationPostCreatedAdmin,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the post was created.',
  })
  public space(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationPostCreatedAdmin,
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
    { payload }: InAppNotificationEntrySpaceCollaborationPostCreatedAdmin
  ): string {
    return payload.postID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The callout ID.',
  })
  public callout(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationPostCreatedAdmin
  ): string {
    return payload.calloutID;
  }
}

import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotificationEntrySpaceCollaborationWhiteboardCreated } from '../../dto/space/in.app.notification.entry.space.collaboration.whiteboard.created';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationEntrySpaceCollaborationWhiteboardCreated)
export class InAppNotificationSpaceCollaborationWhiteboardCreatedResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that created the whiteboard.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationWhiteboardCreated,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the whiteboard was created.',
  })
  public space(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationWhiteboardCreated,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The whiteboard ID.',
  })
  public whiteboard(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationWhiteboardCreated
  ): string {
    return payload.whiteboardID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The callout ID.',
  })
  public callout(
    @Parent()
    { payload }: InAppNotificationEntrySpaceCollaborationWhiteboardCreated
  ): string {
    return payload.calloutID;
  }
}

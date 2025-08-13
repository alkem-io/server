import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { InAppNotificationEntryPlatformSpaceCreated } from '../../dto/platform/in.app.notification.entry.platform.space.created';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationEntryPlatformSpaceCreated)
export class InAppNotificationPlatformSpaceCreatedResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that created the space.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntryPlatformSpaceCreated,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space that was created.',
  })
  public space(
    @Parent()
    { payload }: InAppNotificationEntryPlatformSpaceCreated,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }
}

import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCommunityContributor } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.contributor';

@Resolver(() => InAppNotificationPayloadSpaceCommunityContributor)
export class InAppNotificationPayloadSpaceCommunityContributorResolverFields {
  @ResolveField(() => IContributor, {
    nullable: false,
    description: 'The Contributor that joined.',
  })
  public contributor(
    @Parent() payload: InAppNotificationPayloadSpaceCommunityContributor,
    @Loader(ContributorLoaderCreator)
    loader: ILoader<IContributor>
  ) {
    return loader.load(payload.contributorID);
  }

  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space that was joined.',
  })
  public space(
    @Parent() payload: InAppNotificationPayloadSpaceCommunityContributor,
    @Loader(SpaceLoaderCreator)
    loader: ILoader<ISpace>
  ) {
    return loader.load(payload.spaceID);
  }
}

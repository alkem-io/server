import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationEntryPlatformUserProfileCreated } from '../../dto/platform/in.app.notification.entry.platform.user.profile.created';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationEntryPlatformUserProfileCreated)
export class InAppNotificationPlatformUserProfileCreatedResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that triggered the notification.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntryPlatformUserProfileCreated,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The User that registered.',
  })
  public user(
    @Parent()
    { payload }: InAppNotificationEntryPlatformUserProfileCreated,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.userID);
  }
}

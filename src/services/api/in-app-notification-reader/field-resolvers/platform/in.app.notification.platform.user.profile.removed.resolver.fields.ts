import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationEntryPlatformUserProfileRemoved } from '../../dto/platform/in.app.notification.entry.platform.user.profile.removed';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationEntryPlatformUserProfileRemoved)
export class InAppNotificationPlatformUserProfileRemovedResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that triggered the notification.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntryPlatformUserProfileRemoved,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The display name of the User that was removed.',
  })
  public user(
    @Parent()
    { payload }: InAppNotificationEntryPlatformUserProfileRemoved
  ): string {
    return payload.userDisplayName;
  }
}

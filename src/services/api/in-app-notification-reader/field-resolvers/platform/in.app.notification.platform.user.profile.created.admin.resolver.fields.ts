import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationEntryPlatformUserProfileCreatedAdmin } from '../../dto/platform/in.app.notification.entry.platform.user.profile.created.admin';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationEntryPlatformUserProfileCreatedAdmin)
export class InAppNotificationPlatformUserProfileCreatedAdminResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that triggered the notification.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntryPlatformUserProfileCreatedAdmin,
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
    { payload }: InAppNotificationEntryPlatformUserProfileCreatedAdmin,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.userID);
  }
}

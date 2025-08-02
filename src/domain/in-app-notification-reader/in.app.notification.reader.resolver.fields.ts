import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Loader } from '@core/dataloader/decorators';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IInAppNotificationEntry } from './dto/in.app.notification.entry.interface';

@Resolver(() => IInAppNotificationEntry)
export class InAppNotificationResolverFields {
  @ResolveField(() => IContributor, {
    nullable: false,
    description: 'The receiver of the notification.',
  })
  public receiver(
    @Parent() { receiverID }: IInAppNotificationEntry,
    @Loader(ContributorLoaderCreator) loader: ILoader<IContributor>
  ) {
    return loader.load(receiverID);
  }

  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor who triggered the notification.',
  })
  public triggeredBy(
    @Parent() { payload }: IInAppNotificationEntry,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }
}

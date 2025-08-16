import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Loader } from '@core/dataloader/decorators';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';

@Resolver(() => IInAppNotification)
export class InAppNotificationResolverFields {
  @ResolveField(() => IContributor, {
    nullable: false,
    description: 'The receiver of the notification.',
  })
  public receiver(
    @Parent() { receiverID }: IInAppNotification,
    @Loader(ContributorLoaderCreator) loader: ILoader<IContributor>
  ) {
    return loader.load(receiverID);
  }

  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor who triggered the notification.',
  })
  public triggeredBy(
    @Parent() notification: IInAppNotification,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(notification.triggeredByID);
  }

  @ResolveField(() => IInAppNotificationPayload, {
    nullable: false,
    description: 'The payload of the notification.',
  })
  public payload(
    @Parent() notification: IInAppNotification
  ): IInAppNotificationPayload {
    return notification.payload;
  }
}

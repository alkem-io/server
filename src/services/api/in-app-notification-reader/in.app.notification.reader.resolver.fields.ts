import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Loader } from '@core/dataloader/decorators';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';

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
  @ResolveField(() => String, {
    nullable: false,
    description: 'The type of the notification event.',
  })
  public type(@Parent() notification: IInAppNotification): NotificationEvent {
    return notification.type;
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The state of the notification event.',
  })
  public state(
    @Parent() notification: IInAppNotification
  ): NotificationEventInAppState {
    return notification.state;
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The category of the notification event.',
  })
  public category(
    @Parent() notification: IInAppNotification
  ): NotificationEventCategory {
    return notification.category;
  }

  // When the notification was triggered
  @ResolveField(() => Date, {
    nullable: false,
    description: 'The triggered date of the notification event.',
  })
  public triggeredAt(@Parent() notification: IInAppNotification): Date {
    return notification.triggeredAt;
  }
}

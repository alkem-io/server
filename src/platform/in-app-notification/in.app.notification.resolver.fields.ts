import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver(() => IInAppNotification)
export class InAppNotificationResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @ResolveField(() => IContributor, {
    nullable: false,
    description: 'The receiver of the notification.',
  })
  public async receiver(
    @Parent() { receiverID }: IInAppNotification,
    @Loader(ContributorLoaderCreator) loader: ILoader<IContributor>
  ): Promise<IContributor> {
    return loader.load(receiverID);
  }

  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor who triggered the notification.',
  })
  public async triggeredBy(
    @Parent() notification: IInAppNotification,
    @Loader(ContributorLoaderCreator)
    loader: ILoader<IContributor | null>
  ): Promise<IContributor | null> {
    const { triggeredByID, id } = notification;

    if (!triggeredByID) {
      return null;
    }
    const triggeredBy = await loader.load(triggeredByID);
    if (!triggeredBy) {
      this.logger.warn(
        `InAppNotification ${id} unable to resolve the contributor that triggered it ${triggeredByID}`
      );
      return null;
    }
    return triggeredBy;
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

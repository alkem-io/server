import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IActor } from '@domain/actor/actor/actor.interface';
import { Loader } from '@core/dataloader/decorators';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver(() => IInAppNotification)
export class InAppNotificationResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @ResolveField(() => IActor, {
    nullable: false,
    description: 'The receiver of the notification.',
  })
  public async receiver(
    @Parent() { receiverID }: IInAppNotification,
    @Loader(ContributorLoaderCreator) loader: ILoader<IActor>
  ): Promise<IActor> {
    return loader.load(receiverID);
  }

  @ResolveField(() => IActor, {
    nullable: true,
    description: 'The Contributor who triggered the notification.',
  })
  public async triggeredBy(
    @Parent() notification: IInAppNotification,
    @Loader(ContributorLoaderCreator)
    loader: ILoader<IActor | null>
  ): Promise<IActor | null> {
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

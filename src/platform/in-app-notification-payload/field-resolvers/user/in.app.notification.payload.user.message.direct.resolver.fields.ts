import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadUserMessageDirect } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.direct';

@Resolver(() => InAppNotificationPayloadUserMessageDirect)
export class InAppNotificationPayloadUserMessageDirectResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The User that was sent the message.',
  })
  public async user(
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>,
    @Parent()
    payload: InAppNotificationPayloadUserMessageDirect
  ): Promise<IContributor | null> {
    return loader.load(payload.userID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The message content.',
  })
  public message(
    @Parent()
    payload: InAppNotificationPayloadUserMessageDirect
  ): string {
    return payload.message;
  }
}

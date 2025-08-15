import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationEntryUserMessageSender } from '../../dto/user/in.app.notification.entry.user.message.sender';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationEntryUserMessageSender)
export class InAppNotificationUserMessageSenderResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The User that received the message.',
  })
  public user(
    @Parent()
    { payload }: InAppNotificationEntryUserMessageSender,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.recipientUserID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The message content.',
  })
  public message(
    @Parent()
    { payload }: InAppNotificationEntryUserMessageSender
  ): string {
    return payload.message;
  }
}

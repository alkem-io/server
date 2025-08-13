import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationEntryUserMessageRecipient } from '../../dto/user/in.app.notification.entry.user.message.recipient';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationEntryUserMessageRecipient)
export class InAppNotificationUserMessageRecipientResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that sent the message.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntryUserMessageRecipient,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The User that sent the message.',
  })
  public user(
    @Parent()
    { payload }: InAppNotificationEntryUserMessageRecipient,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.senderUserID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The message content.',
  })
  public message(
    @Parent()
    { payload }: InAppNotificationEntryUserMessageRecipient
  ): string {
    return payload.message;
  }
}

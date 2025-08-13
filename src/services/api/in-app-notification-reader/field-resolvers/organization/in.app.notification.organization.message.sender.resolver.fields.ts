import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationEntryOrganizationMessageSender } from '../../dto/organization/in.app.notification.entry.organization.message.sender';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationEntryOrganizationMessageSender)
export class InAppNotificationOrganizationMessageSenderResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that sent the message.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntryOrganizationMessageSender,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The organization ID.',
  })
  public organization(
    @Parent()
    { payload }: InAppNotificationEntryOrganizationMessageSender
  ): string {
    return payload.organizationID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The message content.',
  })
  public message(
    @Parent()
    { payload }: InAppNotificationEntryOrganizationMessageSender
  ): string {
    return payload.messageID;
  }
}

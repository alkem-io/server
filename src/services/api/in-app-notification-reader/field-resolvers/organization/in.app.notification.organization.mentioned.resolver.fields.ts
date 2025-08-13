import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationEntryOrganizationMentioned } from '../../dto/organization/in.app.notification.entry.organization.mentioned';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationEntryOrganizationMentioned)
export class InAppNotificationOrganizationMentionedResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that mentioned the organization.',
  })
  public contributor(
    @Parent()
    { payload }: InAppNotificationEntryOrganizationMentioned,
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
    { payload }: InAppNotificationEntryOrganizationMentioned
  ): string {
    return payload.organizationID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The comment that mentioned the organization.',
  })
  public comment(
    @Parent()
    { payload }: InAppNotificationEntryOrganizationMentioned
  ): string {
    return payload.commentID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The URL of the comment.',
  })
  public commentUrl(
    @Parent()
    { payload }: InAppNotificationEntryOrganizationMentioned
  ): string {
    return payload.commentOrigin.url;
  }
}

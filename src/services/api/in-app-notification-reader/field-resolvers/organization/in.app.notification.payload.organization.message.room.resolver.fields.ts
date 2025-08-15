import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { InAppNotificationPayloadOrganizationMessageRoom } from '@platform/in-app-notification/dto/payload/organization/notification.in.app.payload.organization.message.room';

@Resolver(() => InAppNotificationPayloadOrganizationMentioned)
export class InAppNotificationOrganizationMentionedResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The organization.',
  })
  public async organization(
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>,
    @Parent()
    payload: InAppNotificationPayloadOrganizationMessageRoom
  ): Promise<IContributor | null> {
    return loader.load(payload.organizationID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The comment that mentioned the organization.',
  })
  public comment(
    @Parent()
    payload: InAppNotificationPayloadOrganizationMessageRoom
  ): string {
    return payload.commentID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The URL of the comment.',
  })
  public commentUrl(
    @Parent()
    payload: InAppNotificationPayloadOrganizationMentioned
  ): string {
    return payload.commentOrigin.url;
  }
}

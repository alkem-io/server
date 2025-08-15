import { ContributorLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadOrganizationMessageDirect } from '@platform/in-app-notification/dto/payload/organization/notification.in.app.payload.organization.message.direct';

@Resolver(() => InAppNotificationPayloadOrganizationMessageDirect)
export class InAppNotificationPayloadOrganizationMessageDirectResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The organization.',
  })
  public async organization(
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>,
    @Parent()
    payload: InAppNotificationPayloadOrganizationMessageDirect
  ): Promise<IContributor | null> {
    return loader.load(payload.organizationID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The message content.',
  })
  public message(
    @Parent()
    payload: InAppNotificationPayloadOrganizationMessageDirect
  ): string {
    return payload.message;
  }
}

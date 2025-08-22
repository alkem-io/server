import { OrganizationLoaderCreator } from '@core/dataloader/creators/loader.creators/organization.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IOrganization } from '@domain/community/organization';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadOrganizationMessageDirect } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.direct';

@Resolver(() => InAppNotificationPayloadOrganizationMessageDirect)
export class InAppNotificationPayloadOrganizationMessageDirectResolverFields {
  @ResolveField(() => IContributor, {
    nullable: false,
    description: 'The organization.',
  })
  public async organization(
    @Loader(OrganizationLoaderCreator, { resolveToNull: true })
    loader: ILoader<IOrganization | null>,
    @Parent()
    payload: InAppNotificationPayloadOrganizationMessageDirect
  ): Promise<IOrganization | null> {
    return loader.load(payload.organizationID);
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The message content.',
  })
  public message(
    @Parent()
    payload: InAppNotificationPayloadOrganizationMessageDirect
  ): string {
    return payload.message;
  }
}

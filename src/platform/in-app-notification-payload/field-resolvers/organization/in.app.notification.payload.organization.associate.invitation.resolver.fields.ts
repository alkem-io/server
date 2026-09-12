import { OrganizationLoaderCreator } from '@core/dataloader/creators';
import { InvitationLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/invitation.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IInvitation } from '@domain/access/invitation';
import { IOrganization } from '@domain/community/organization';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadOrganizationAssociateInvitation } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.associate.invitation';

@Resolver(() => InAppNotificationPayloadOrganizationAssociateInvitation)
export class InAppNotificationPayloadOrganizationAssociateInvitationResolverFields {
  @ResolveField(() => IOrganization, {
    nullable: true,
    description: 'The organization the invitation is for.',
  })
  public async organization(
    @Parent() payload: InAppNotificationPayloadOrganizationAssociateInvitation,
    @Loader(OrganizationLoaderCreator, { resolveToNull: true })
    loader: ILoader<IOrganization | null>
  ): Promise<IOrganization | null> {
    return loader.load(payload.organizationID);
  }

  @ResolveField(() => IInvitation, {
    nullable: true,
    description:
      'The underlying invitation — offered role(s) and message. Null once the invitation record no longer resolves (e.g. the organization was deleted).',
  })
  public async invitation(
    @Parent() payload: InAppNotificationPayloadOrganizationAssociateInvitation,
    @Loader(InvitationLoaderCreator, { resolveToNull: true })
    loader: ILoader<IInvitation | null>
  ): Promise<IInvitation | null> {
    return loader.load(payload.invitationID);
  }
}

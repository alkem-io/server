import { OrganizationLoaderCreator } from '@core/dataloader/creators';
import { ActorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/actor.loader.creator';
import { ApplicationLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/application.loader.creator';
import { InvitationLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/invitation.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IApplication } from '@domain/access/application/application.interface';
import { IInvitation } from '@domain/access/invitation';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IOrganization } from '@domain/community/organization';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadOrganizationAssociateActor } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.associate.actor';

@Resolver(() => InAppNotificationPayloadOrganizationAssociateActor)
export class InAppNotificationPayloadOrganizationAssociateActorResolverFields {
  @ResolveField(() => IOrganization, {
    nullable: true,
    description: 'The organization the actor is associated with.',
  })
  public async organization(
    @Parent() payload: InAppNotificationPayloadOrganizationAssociateActor,
    @Loader(OrganizationLoaderCreator, { resolveToNull: true })
    loader: ILoader<IOrganization | null>
  ): Promise<IOrganization | null> {
    return loader.load(payload.organizationID);
  }

  @ResolveField(() => IActor, {
    nullable: true,
    description: 'The user who applied, responded to an invitation, or joined.',
  })
  public async actor(
    @Parent() payload: InAppNotificationPayloadOrganizationAssociateActor,
    @Loader(ActorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IActor | null>
  ): Promise<IActor | null> {
    return loader.load(payload.actorID);
  }

  @ResolveField(() => IApplication, {
    nullable: true,
    description:
      'The underlying application — set for the three application events.',
  })
  public async application(
    @Parent() payload: InAppNotificationPayloadOrganizationAssociateActor,
    @Loader(ApplicationLoaderCreator, { resolveToNull: true })
    loader: ILoader<IApplication | null>
  ): Promise<IApplication | null> {
    if (!payload.applicationID) {
      return null;
    }
    return loader.load(payload.applicationID);
  }

  @ResolveField(() => IInvitation, {
    nullable: true,
    description: 'The underlying invitation — set for the two response events.',
  })
  public async invitation(
    @Parent() payload: InAppNotificationPayloadOrganizationAssociateActor,
    @Loader(InvitationLoaderCreator, { resolveToNull: true })
    loader: ILoader<IInvitation | null>
  ): Promise<IInvitation | null> {
    if (!payload.invitationID) {
      return null;
    }
    return loader.load(payload.invitationID);
  }
}

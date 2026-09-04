import { OrganizationLoaderCreator } from '@core/dataloader/creators';
import { InvitationLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/invitation.loader.creator';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IInvitation } from '@domain/access/invitation';
import { IOrganization } from '@domain/community/organization';
import { ISpace } from '@domain/space/space/space.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadSpaceCommunityInvitation } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.invitation';

@Resolver(() => InAppNotificationPayloadSpaceCommunityInvitation)
export class InAppNotificationPayloadSpaceCommunityInvitationResolverFields {
  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space that the invitation is for.',
  })
  public async space(
    @Parent() payload: InAppNotificationPayloadSpaceCommunityInvitation,
    @Loader(SpaceLoaderCreator)
    loader: ILoader<ISpace>
  ): Promise<ISpace> {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => IOrganization, {
    nullable: true,
    description:
      'The organization the invitation is for, when the invitee is an organization.',
  })
  public async organization(
    @Parent() payload: InAppNotificationPayloadSpaceCommunityInvitation,
    @Loader(OrganizationLoaderCreator, { resolveToNull: true })
    loader: ILoader<IOrganization | null>
  ): Promise<IOrganization | null> {
    if (!payload.organizationID) {
      return null;
    }
    return loader.load(payload.organizationID);
  }

  @ResolveField(() => IInvitation, {
    nullable: true,
    description:
      'The underlying invitation — role(s) offered, whether the parent Space is also joined, and the Spaces that will be joined on acceptance.',
  })
  public async invitation(
    @Parent() payload: InAppNotificationPayloadSpaceCommunityInvitation,
    @Loader(InvitationLoaderCreator, { resolveToNull: true })
    loader: ILoader<IInvitation | null>
  ): Promise<IInvitation | null> {
    return loader.load(payload.invitationID);
  }
}

import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { InAppNotificationPayloadOrganizationMessageRoom } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.room';
import { OrganizationLoaderCreator } from '@core/dataloader/creators/loader.creators/organization.loader.creator';
import { IOrganization } from '@domain/community/organization/organization.interface';
@Resolver(() => InAppNotificationPayloadOrganizationMessageRoom)
export class InAppNotificationPayloadOrganizationMessageRoomResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The organization.',
  })
  public async organization(
    @Loader(OrganizationLoaderCreator, { resolveToNull: true })
    loader: ILoader<IOrganization | null>,
    @Parent()
    payload: InAppNotificationPayloadOrganizationMessageRoom
  ): Promise<IOrganization | null> {
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
    return payload.messageID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The Room ID with of the comment.',
  })
  public roomID(
    @Parent()
    payload: InAppNotificationPayloadOrganizationMessageRoom
  ): string {
    return payload.roomID;
  }
}

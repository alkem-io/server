import { OrganizationLoaderCreator } from '@core/dataloader/creators/loader.creators/organization.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadOrganizationMessageRoom } from '@platform/in-app-notification-payload/dto/organization/notification.in.app.payload.organization.message.room';
@Resolver(() => InAppNotificationPayloadOrganizationMessageRoom)
export class InAppNotificationPayloadOrganizationMessageRoomResolverFields {
  @ResolveField(() => IOrganization, {
    nullable: false,
    description: 'The organization.',
  })
  public async organization(
    @Loader(OrganizationLoaderCreator, { resolveToNull: false })
    loader: ILoader<IOrganization>,
    @Parent()
    payload: InAppNotificationPayloadOrganizationMessageRoom
  ): Promise<IOrganization> {
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

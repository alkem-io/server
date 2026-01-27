import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
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
}

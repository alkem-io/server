import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCommunityInvitation } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.invitation';

@Resolver(() => InAppNotificationPayloadSpaceCommunityInvitation)
export class InAppNotificationPayloadSpaceCommunityInvitationResolverFields {
  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space that the invitation is for.',
  })
  public async space(
    @Parent() payload: InAppNotificationPayloadSpaceCommunityInvitation,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ): Promise<ISpace> {
    const space = await loader.load(payload.spaceID);
    if (!space) {
      throw new Error('Space not found');
    }
    return space;
  }
}

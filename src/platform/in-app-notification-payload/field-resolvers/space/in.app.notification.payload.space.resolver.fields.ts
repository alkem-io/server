import { SpaceLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadSpace } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space';

@Resolver(() => InAppNotificationPayloadSpace)
export class InAppNotificationPayloadSpaceResolverFields {
  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The space details.',
  })
  public async space(
    @Parent()
    payload: InAppNotificationPayloadSpace,
    @Loader(SpaceLoaderCreator)
    loader: ILoader<ISpace>
  ): Promise<ISpace> {
    return loader.load(payload.spaceID);
  }
}

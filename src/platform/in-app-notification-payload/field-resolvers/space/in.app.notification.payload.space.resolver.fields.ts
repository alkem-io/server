import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadSpace } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space';
import { ISpace } from '@domain/space/space/space.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';

@Resolver(() => InAppNotificationPayloadSpace)
export class InAppNotificationPayloadSpaceResolverFields {
  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The space details.',
  })
  public async space(
    @Parent()
    payload: InAppNotificationPayloadSpace,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ): Promise<ISpace | null> {
    return loader.load(payload.spaceID);
  }
}

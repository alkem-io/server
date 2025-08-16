import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCommunicationUpdate } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.communication.update';

@Resolver(() => InAppNotificationPayloadSpaceCommunicationUpdate)
export class InAppNotificationSpaceCommunicationUpdateResolverFields {
  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the update was sent.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunicationUpdate,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The update content.',
  })
  public update(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunicationUpdate
  ): string {
    return payload.updateID;
  }
}

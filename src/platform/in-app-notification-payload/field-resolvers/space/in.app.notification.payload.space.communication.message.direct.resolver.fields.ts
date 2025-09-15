import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCommunicationMessageDirect } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.communication.message.direct';

@Resolver(() => InAppNotificationPayloadSpaceCommunicationMessageDirect)
export class InAppNotificationPayloadSpaceCommunicationMessageDirectResolverFields {
  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the message was sent.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunicationMessageDirect,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The message content.',
  })
  public message(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunicationMessageDirect
  ): string {
    return payload.message;
  }
}

import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCollaborationWhiteboard } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.whiteboard';

@Resolver(() => InAppNotificationPayloadSpaceCollaborationWhiteboard)
export class InAppNotificationPayloadSpaceCollaborationWhiteboardResolverFields {
  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space where the whiteboard was created.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationWhiteboard,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The whiteboard ID.',
  })
  public whiteboard(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationWhiteboard
  ): string {
    return payload.whiteboardID;
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The callout ID.',
  })
  public callout(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationWhiteboard
  ): string {
    return payload.calloutID;
  }
}

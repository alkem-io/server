import { CalloutLoaderCreator } from '@core/dataloader/creators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadSpaceCollaborationCalloutReaction } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.callout.reaction';

@Resolver(() => InAppNotificationPayloadSpaceCollaborationCalloutReaction)
export class InAppNotificationPayloadSpaceCollaborationCalloutReactionResolverFields {
  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space where the reaction was made.',
  })
  public async space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationCalloutReaction,
    @Loader(SpaceLoaderCreator)
    loader: ILoader<ISpace>
  ): Promise<ISpace> {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => ICallout, {
    nullable: false,
    description: 'The Callout that was reacted to.',
  })
  public callout(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationCalloutReaction,
    @Loader(CalloutLoaderCreator)
    loader: ILoader<ICallout>
  ): Promise<ICallout> {
    return loader.load(payload.calloutID);
  }

  @ResolveField(() => String, {
    nullable: false,
    description:
      'The emoji slug from the platform allow-list. Clients own slug-to-glyph rendering.',
  })
  public emoji(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationCalloutReaction
  ): string {
    return payload.emoji;
  }
}

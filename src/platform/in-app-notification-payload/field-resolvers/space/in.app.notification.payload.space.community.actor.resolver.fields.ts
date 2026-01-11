import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IActor } from '@domain/actor/actor/actor.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { ActorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/actor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCommunityActor } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.actor';

@Resolver(() => InAppNotificationPayloadSpaceCommunityActor)
export class InAppNotificationPayloadSpaceCommunityActorResolverFields {
  @ResolveField(() => IActor, {
    nullable: false,
    description: 'The Actor that joined.',
  })
  public actor(
    @Parent() payload: InAppNotificationPayloadSpaceCommunityActor,
    @Loader(ActorLoaderCreator)
    loader: ILoader<IActor>
  ) {
    return loader.load(payload.actorId);
  }

  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space that was joined.',
  })
  public space(
    @Parent() payload: InAppNotificationPayloadSpaceCommunityActor,
    @Loader(SpaceLoaderCreator)
    loader: ILoader<ISpace>
  ) {
    return loader.load(payload.spaceID);
  }
}

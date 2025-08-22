import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCollaborationPost } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.post';

@Resolver(() => InAppNotificationPayloadSpaceCollaborationPost)
export class InAppNotificationPayloadSpaceCollaborationPostResolverFields {
  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The Space where the post was created.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationPost,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The post ID.',
  })
  public post(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationPost
  ): string {
    return payload.postID;
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The callout ID.',
  })
  public callout(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationPost
  ): string {
    return payload.calloutID;
  }
}

import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCollaborationPostComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.post.comment';

@Resolver(() => InAppNotificationPayloadSpaceCollaborationPostComment)
export class InAppNotificationSpaceCollaborationPostCommentResolverFields {
  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the comment was created.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationPostComment,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The post ID.',
  })
  public post(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationPostComment
  ): string {
    return payload.postID;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The comment ID.',
  })
  public comment(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationPostComment
  ): string {
    return payload.messageID;
  }
}

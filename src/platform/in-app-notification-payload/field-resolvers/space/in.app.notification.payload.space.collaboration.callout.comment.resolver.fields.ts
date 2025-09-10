import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { MessageDetails } from '@domain/communication/message.details/message.details.interface';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutLoaderCreator } from '@core/dataloader/creators';
import { InAppNotificationPayloadSpaceCollaborationCalloutComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.callout.comment';

@Resolver(() => InAppNotificationPayloadSpaceCollaborationCalloutComment)
export class InAppNotificationPayloadSpaceCollaborationCalloutCommentResolverFields {
  constructor(private messageDetailsService: MessageDetailsService) {}

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the comment was made.',
  })
  public async space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationCalloutComment,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ): Promise<ISpace | null> {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => ICallout, {
    nullable: true,
    description: 'The Callout that was published.',
  })
  public callout(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationCalloutComment,
    @Loader(CalloutLoaderCreator, { resolveToNull: true })
    loader: ILoader<ICallout | null>
  ): Promise<ICallout | null> {
    return loader.load(payload.calloutID);
  }

  @ResolveField(() => MessageDetails, {
    nullable: false,
    description: 'The details of the message.',
  })
  public async messageDetails(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationCalloutComment
  ): Promise<MessageDetails | null> {
    return await this.messageDetailsService.getMessageDetails(
      payload.roomID,
      payload.messageID
    );
  }
}

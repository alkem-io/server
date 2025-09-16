import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCollaborationCalloutPostComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.callout.post.comment';
import { MessageDetails } from '@domain/communication/message.details/message.details.interface';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutLoaderCreator } from '@core/dataloader/creators';
import { LogContext } from '@common/enums/logging.context';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService } from '@nestjs/common';

@Resolver(() => InAppNotificationPayloadSpaceCollaborationCalloutPostComment)
export class InAppNotificationPayloadSpaceCollaborationCalloutPostCommentResolverFields {
  constructor(
    private messageDetailsService: MessageDetailsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the comment was made.',
  })
  public async space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationCalloutPostComment,
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
    payload: InAppNotificationPayloadSpaceCollaborationCalloutPostComment,
    @Loader(CalloutLoaderCreator, { resolveToNull: true })
    loader: ILoader<ICallout | null>
  ): Promise<ICallout | null> {
    return loader.load(payload.calloutID);
  }

  @ResolveField(() => MessageDetails, {
    nullable: true,
    description: 'The details of the message.',
  })
  public async messageDetails(
    @Parent()
    payload: InAppNotificationPayloadSpaceCollaborationCalloutPostComment
  ): Promise<MessageDetails | null> {
    try {
      return await this.messageDetailsService.getMessageDetails(
        payload.roomID,
        payload.messageID
      );
    } catch (error) {
      this.logger.error(
        {
          messageId: payload.messageID,
          roomId: payload.roomID,
          msg: 'BROKEN_NOTIFICATION_PAYLOAD',
          name: InAppNotificationPayloadSpaceCollaborationCalloutPostComment.name,
        },
        (error as Error)?.stack,
        LogContext.IN_APP_NOTIFICATION
      );
      return null;
    }
  }
}

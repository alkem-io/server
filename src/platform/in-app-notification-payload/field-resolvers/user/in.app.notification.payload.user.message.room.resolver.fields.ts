import { LogContext } from '@common/enums/logging.context';
import { UserLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { MessageDetails } from '@domain/communication/message.details/message.details.interface';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadUserMessageRoom } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.room';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver(() => InAppNotificationPayloadUserMessageRoom)
export class InAppNotificationPayloadUserMessageRoomResolverFields {
  constructor(
    private messageDetailsService: MessageDetailsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField(() => IUser, {
    nullable: false,
    description: 'The User receiver of the message.',
  })
  public async user(
    @Loader(UserLoaderCreator) loader: ILoader<IUser>,
    @Parent() payload: InAppNotificationPayloadUserMessageRoom
  ): Promise<IUser> {
    return loader.load(payload.userID);
  }

  @ResolveField(() => MessageDetails, {
    nullable: true,
    description: 'The details of the message.',
  })
  public async messageDetails(
    @Parent() payload: InAppNotificationPayloadUserMessageRoom
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
          name: InAppNotificationPayloadUserMessageRoom.name,
        },
        (error as Error)?.stack,
        LogContext.IN_APP_NOTIFICATION
      );
    }

    return null;
  }
}

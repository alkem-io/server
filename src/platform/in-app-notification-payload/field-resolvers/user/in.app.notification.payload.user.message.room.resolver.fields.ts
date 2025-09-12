import { UserLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { MessageDetails } from '@domain/communication/message.details/message.details.interface';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
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
    nullable: true,
    description: 'The User for the message.',
  })
  public async user(
    @Loader(UserLoaderCreator, { resolveToNull: true })
    loader: ILoader<IUser | null>,
    @Parent()
    payload: InAppNotificationPayloadUserMessageRoom
  ): Promise<IUser | null> {
    return loader.load(payload.userID);
  }

  @ResolveField(() => MessageDetails, {
    nullable: false,
    description: 'The details of the message.',
  })
  public async messageDetails(
    @Parent()
    payload: InAppNotificationPayloadUserMessageRoom
  ): Promise<MessageDetails | null> {
    return await this.messageDetailsService.getMessageDetails(
      payload.roomID,
      payload.messageID
    );
  }
}

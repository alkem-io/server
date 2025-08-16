import { UserLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadUserMessageDirect } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.direct';
import { InAppNotificationPayloadUserMessageRoom } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.room';

@Resolver(() => InAppNotificationPayloadUserMessageRoom)
export class InAppNotificationPayloadUserMessageRoomResolverFields {
  @ResolveField(() => String, {
    nullable: true,
    description: 'The original message ID.',
  })
  public originalMessageID(
    @Parent()
    payload: InAppNotificationPayloadUserMessageRoom
  ): string | undefined {
    return payload.messageID;
  }
  @ResolveField(() => String, {
    nullable: true,
    description: 'The original message ID.',
  })
  public comment(
    @Parent()
    payload: InAppNotificationPayloadUserMessageRoom
  ): string | undefined {
    return payload.comment;
  }
  @ResolveField(() => String, {
    nullable: true,
    description: 'The original message ID.',
  })
  public commentUrl(
    @Parent()
    payload: InAppNotificationPayloadUserMessageRoom
  ): string | undefined {
    return payload.commentUrl;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The original message ID.',
  })
  public commentOriginName(
    @Parent()
    payload: InAppNotificationPayloadUserMessageRoom
  ): string | undefined {
    return payload.commentOriginName;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The room for the message.',
  })
  public roomID(
    @Parent()
    payload: InAppNotificationPayloadUserMessageRoom
  ): string | undefined {
    return payload.roomID;
  }

  @ResolveField(() => IUser, {
    nullable: true,
    description: 'The User for the message.',
  })
  public async user(
    @Loader(UserLoaderCreator, { resolveToNull: true })
    loader: ILoader<IUser | null>,
    @Parent()
    payload: InAppNotificationPayloadUserMessageDirect
  ): Promise<IUser | null> {
    return loader.load(payload.userID);
  }
}

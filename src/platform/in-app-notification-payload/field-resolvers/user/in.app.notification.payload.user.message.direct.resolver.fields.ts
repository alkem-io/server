import { UserLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadUserMessageDirect } from '@platform/in-app-notification-payload/dto/user/notification.in.app.payload.user.message.direct';

@Resolver(() => InAppNotificationPayloadUserMessageDirect)
export class InAppNotificationPayloadUserMessageDirectResolverFields {
  @ResolveField(() => IUser, {
    nullable: true,
    description: 'The User that was sent the message.',
  })
  public async user(
    @Loader(UserLoaderCreator, { resolveToNull: true })
    loader: ILoader<IUser | null>,
    @Parent()
    payload: InAppNotificationPayloadUserMessageDirect
  ): Promise<IUser | null> {
    return loader.load(payload.userID);
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The message content.',
  })
  public message(
    @Parent()
    payload: InAppNotificationPayloadUserMessageDirect
  ): string {
    return payload.message;
  }
}

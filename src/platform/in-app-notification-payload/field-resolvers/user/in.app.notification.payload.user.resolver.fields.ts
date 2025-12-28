import { UserLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InAppNotificationPayloadUser } from '@platform/in-app-notification-payload/dto/user';

@Resolver(() => InAppNotificationPayloadUser)
export class InAppNotificationPayloadUserResolverFields {
  @ResolveField(() => IUser, {
    nullable: false,
  })
  public async user(
    @Loader(UserLoaderCreator)
    loader: ILoader<IUser>,
    @Parent()
    payload: InAppNotificationPayloadUser
  ): Promise<IUser> {
    return loader.load(payload.userID);
  }
}

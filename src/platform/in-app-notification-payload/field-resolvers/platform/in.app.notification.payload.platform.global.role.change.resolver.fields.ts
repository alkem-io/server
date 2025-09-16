import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { InAppNotificationPayloadPlatformGlobalRoleChange } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.global.role.change';
import { IUser } from '@domain/community/user/user.interface';
import { UserLoaderCreator } from '@core/dataloader/creators/loader.creators/user.loader.creator';

@Resolver(() => InAppNotificationPayloadPlatformGlobalRoleChange)
export class InAppNotificationPayloadPlatformGlobalRoleChangeResolverFields {
  constructor() {}

  @ResolveField(() => IUser, {
    nullable: true,
    description: 'The User whose role was changed.',
  })
  public async user(
    @Parent()
    payload: InAppNotificationPayloadPlatformGlobalRoleChange,
    @Loader(UserLoaderCreator, { resolveToNull: true })
    loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    return await loader.load(payload.userID);
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The new role.',
  })
  public role(
    @Parent()
    payload: InAppNotificationPayloadPlatformGlobalRoleChange
  ): string {
    return payload.roleName;
  }
}

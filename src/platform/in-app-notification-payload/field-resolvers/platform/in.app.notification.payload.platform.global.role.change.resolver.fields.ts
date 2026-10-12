import { RoleChangeType } from '@alkemio/notifications-lib';
import { UserLoaderCreator } from '@core/dataloader/creators/loader.creators/user.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadPlatformGlobalRoleChange } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.global.role.change';

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
    nullable: false,
    description: 'The new role.',
  })
  public role(
    @Parent()
    payload: InAppNotificationPayloadPlatformGlobalRoleChange
  ): string {
    return payload.roleName;
  }

  @ResolveField(() => RoleChangeType, {
    nullable: true,
    description:
      'Whether the role was added or removed; absent on records written before this field existed.',
  })
  public changeType(
    @Parent()
    payload: InAppNotificationPayloadPlatformGlobalRoleChange
  ): RoleChangeType | undefined {
    return payload.changeType;
  }
}

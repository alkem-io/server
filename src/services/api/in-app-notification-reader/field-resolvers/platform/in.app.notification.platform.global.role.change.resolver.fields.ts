import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationPayloadPlatformGlobalRoleChange } from '../../dto/platform/in.app.notification.entry.platform.global.role.change';
import { ContributorLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/contributor.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => InAppNotificationPayloadPlatformGlobalRoleChange)
export class InAppNotificationPlatformGlobalRoleChangeResolverFields {
  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The Contributor that triggered the notification.',
  })
  public contributor(
    @Parent()
    payload: InAppNotificationPayloadPlatformGlobalRoleChange,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.triggeredByID);
  }

  @ResolveField(() => IContributor, {
    nullable: true,
    description: 'The User whose role was changed.',
  })
  public user(
    @Parent()
    payload: InAppNotificationPayloadPlatformGlobalRoleChange,
    @Loader(ContributorLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ) {
    return loader.load(payload.userID);
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

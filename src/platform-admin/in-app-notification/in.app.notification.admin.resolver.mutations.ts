import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { PruneInAppNotificationAdminResult } from './dto/in.app.notification.admin.dto.prune.result';
import { InAppNotificationAdminService } from './in.app.notification.admin.service';

@InstrumentResolver()
@Resolver()
export class InAppNotificationAdminResolverMutations {
  constructor(
    private readonly inAppNotificationsAdminService: InAppNotificationAdminService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private readonly authorizationService: AuthorizationService
  ) {}

  @Mutation(() => PruneInAppNotificationAdminResult, {
    description:
      'Prunes InAppNotifications according to the platform defined criteria. The effects of the pruning are returned.',
  })
  async adminInAppNotificationsPrune(
    @CurrentActor() actorContext: ActorContext
  ): Promise<PruneInAppNotificationAdminResult> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'pruning InApp Notifications'
    );

    return await this.inAppNotificationsAdminService.pruneInAppNotifications();
  }
}

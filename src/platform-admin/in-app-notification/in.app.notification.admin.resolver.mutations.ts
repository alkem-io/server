import { CurrentActor } from '@common/decorators';
import { ActorContext } from '@core/actor-context';
import { Resolver, Mutation } from '@nestjs/graphql';
import { InAppNotificationAdminService } from './in.app.notification.admin.service';
import { PruneInAppNotificationAdminResult } from './dto/in.app.notification.admin.dto.prune.result';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InstrumentResolver } from '@src/apm/decorators';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';

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
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'pruning InApp Notifications'
    );

    return await this.inAppNotificationsAdminService.pruneInAppNotifications();
  }
}

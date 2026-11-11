import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { AdminUserSecondFactorService } from './admin.user.second.factor.service';
import {
  AdminResetUserSecondFactorInput,
  AdminResetUserSecondFactorResult,
} from './dto/admin.user.second.factor.dto';

@InstrumentResolver()
@Resolver()
export class AdminUserSecondFactorResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly adminUserSecondFactorService: AdminUserSecondFactorService
  ) {}

  @Mutation(() => AdminResetUserSecondFactorResult, {
    description:
      "Platform Support or Platform Users Admin: remove a user's second factor (authenticator app, security keys, recovery codes) and end all their sessions. Audited fail-closed. Refuses self-targeting.",
  })
  async adminResetUserSecondFactor(
    @CurrentActor() actorContext: ActorContext,
    @Args('resetData') resetData: AdminResetUserSecondFactorInput
  ): Promise<AdminResetUserSecondFactorResult> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_SECOND_FACTOR_RESET,
      'adminResetUserSecondFactor'
    );
    return this.adminUserSecondFactorService.resetSecondFactor(
      actorContext,
      resetData.userID
    );
  }
}

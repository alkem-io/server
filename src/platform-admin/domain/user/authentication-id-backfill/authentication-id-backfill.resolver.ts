import { Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationPrivilege } from '@common/enums';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { AdminAuthenticationIDBackfillService } from './authentication-id-backfill.service';
import { AdminAuthenticationIDBackfillResult } from './dto/admin.authentication-id-backfill.result';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class AdminAuthenticationIDBackfillResolver {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly adminAuthenticationIDBackfillService: AdminAuthenticationIDBackfillService
  ) {}

  @Mutation(() => AdminAuthenticationIDBackfillResult, {
    description:
      'Populate authenticationID for existing users by querying Kratos Admin API',
  })
  @Profiling.api
  async adminBackfillAuthenticationIDs(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<AdminAuthenticationIDBackfillResult> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `adminBackfillAuthenticationIDs:${agentInfo.userID}`
    );

    return this.adminAuthenticationIDBackfillService.backfillAuthenticationIDs();
  }
}

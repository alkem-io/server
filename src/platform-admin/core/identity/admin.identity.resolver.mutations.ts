import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { AdminIdentityService } from './admin.identity.service';

@InstrumentResolver()
@Resolver()
export class AdminIdentityResolverMutations {
  constructor(
    private adminIdentityService: AdminIdentityService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Mutation(() => Boolean, {
    nullable: false,
    description: 'Delete a Kratos identity by email.',
  })
  async adminIdentityDeleteKratosIdentity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('email', { type: () => String })
    email: string
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
      'adminIdentityDeleteKratosIdentity'
    );

    return await this.adminIdentityService.deleteIdentityByEmail(email);
  }
}

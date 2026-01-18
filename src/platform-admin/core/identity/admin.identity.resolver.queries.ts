import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Query, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { AdminIdentityService } from './admin.identity.service';
import { KratosIdentityDto } from './dto/kratos.identity.dto';

@InstrumentResolver()
@Resolver()
export class AdminIdentityResolverQueries {
  constructor(
    private adminIdentityService: AdminIdentityService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => [KratosIdentityDto], {
    nullable: false,
    description: 'Get all unverified identities from Kratos.',
  })
  async adminIdentitiesUnverified(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<KratosIdentityDto[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'adminIdentitiesUnverified'
    );

    return this.adminIdentityService.getUnverifiedIdentities();
  }
}

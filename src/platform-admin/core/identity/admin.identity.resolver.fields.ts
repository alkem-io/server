import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IdentityVerificationStatusFilter } from '@common/enums/identity.verification.status.filter';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { PlatformAdminIdentityQueryResults } from '../../admin/dto/platform.admin.query.identity.results';
import { AdminIdentityService } from './admin.identity.service';
import { KratosIdentityDto } from './dto/kratos.identity.dto';

@InstrumentResolver()
@Resolver(() => PlatformAdminIdentityQueryResults)
export class AdminIdentityResolverFields {
  constructor(
    private adminIdentityService: AdminIdentityService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @ResolveField(() => [KratosIdentityDto], {
    nullable: false,
    description: 'Get identities from Kratos with optional filtering.',
  })
  async identities(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('filter', {
      type: () => IdentityVerificationStatusFilter,
      nullable: true,
      defaultValue: IdentityVerificationStatusFilter.ALL,
      description: 'Filter identities by verification status',
    })
    filter?: IdentityVerificationStatusFilter
  ): Promise<KratosIdentityDto[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'adminIdentities'
    );

    return this.adminIdentityService.getIdentitiesByVerificationStatus(filter);
  }
}

import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { AdminIdentityService } from './admin.identity.service';
import { PlatformAdminIdentityQueryResults } from '../../admin/dto/platform.admin.query.identity.results';
import { IdentityVerificationStatusFilter } from '@common/enums/identity.verification.status.filter';
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
    @CurrentUser() actorContext: ActorContext,
    @Args('filter', {
      type: () => IdentityVerificationStatusFilter,
      nullable: true,
      defaultValue: IdentityVerificationStatusFilter.ALL,
      description: 'Filter identities by verification status',
    })
    filter?: IdentityVerificationStatusFilter
  ): Promise<KratosIdentityDto[]> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'adminIdentities'
    );

    return this.adminIdentityService.getIdentitiesByVerificationStatus(filter);
  }
}

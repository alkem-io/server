import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IdentityVerificationStatusFilter } from '@common/enums/identity.verification.status.filter';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
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
    @CurrentActor() actorContext: ActorContext,
    @Args('filter', {
      type: () => IdentityVerificationStatusFilter,
      nullable: true,
      defaultValue: IdentityVerificationStatusFilter.ALL,
      description: 'Filter identities by verification status',
    })
    filter?: IdentityVerificationStatusFilter
  ): Promise<KratosIdentityDto[]> {
    // 027-platform-role-redesign (live finding F6, closed by T074 in Slice B)
    // — the read half of A5. `platform-users-admin` owns identity reset and
    // account deletion, so it owns the list those act on; the retired
    // `PLATFORM_ADMIN` catch-all this field rode is gone.
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
      'adminIdentities'
    );

    return this.adminIdentityService.getIdentitiesByVerificationStatus(filter);
  }
}

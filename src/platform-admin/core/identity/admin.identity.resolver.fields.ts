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
    // 027-platform-role-redesign (live finding F6) — the read half of A5.
    // `platform-users-admin` owns identity reset and account deletion but was
    // denied the list those act on, because this field rode the retiring
    // `PLATFORM_ADMIN` catch-all. Additive: the catch-all is still checked
    // first, so no legacy holder loses the list.
    const policy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    if (
      !this.authorizationService.isAccessGranted(
        actorContext,
        policy,
        AuthorizationPrivilege.PLATFORM_USERS_ADMIN
      )
    ) {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        policy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        'adminIdentities'
      );
    }

    return this.adminIdentityService.getIdentitiesByVerificationStatus(filter);
  }
}

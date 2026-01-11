import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { AdminIdentityService } from './admin.identity.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';

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
    description: 'Delete a Kratos identity by ID.',
  })
  async adminIdentityDeleteKratosIdentity(
    @CurrentActor() actorContext: ActorContext,
    @Args('kratosIdentityId', { type: () => UUID })
    kratosIdentityId: string
  ): Promise<boolean> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
      'adminIdentityDeleteKratosIdentity'
    );

    const success =
      await this.adminIdentityService.deleteIdentity(kratosIdentityId);
    return success;
  }
}

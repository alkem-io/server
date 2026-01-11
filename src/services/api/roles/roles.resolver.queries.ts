import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorContext } from '@core/actor-context';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RolesActorInput } from './dto/roles.dto.input.actor';
import { RolesService } from './roles.service';
import { ActorRoles } from './dto/roles.dto.result.actor';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class RolesResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private rolesServices: RolesService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => ActorRoles, {
    nullable: false,
    description: 'The roles that the specified Actor has.',
  })
  async rolesActor(
    @CurrentActor() actorContext: ActorContext,
    @Args('rolesData') rolesData: RolesActorInput
  ): Promise<ActorRoles> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `roles actor query: ${actorContext.actorId}`
    );
    return this.rolesServices.getRolesForActor(rolesData);
  }
}

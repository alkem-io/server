import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import {
  RolesOrganizationInput,
  RolesUserInput,
  RolesVirtualContributorInput,
} from './dto/roles.dto.input.actor';
import { ActorRoles } from './dto/roles.dto.result.actor';
import { RolesService } from './roles.service';

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
    description: 'The roles that that the specified User has.',
  })
  async rolesUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('rolesData') rolesData: RolesUserInput
  ): Promise<ActorRoles> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `roles user query: ${actorContext.actorID}`
    );
    return this.rolesServices.getRolesForUser(rolesData);
  }

  @Query(() => ActorRoles, {
    description: 'The roles that the specified Organization has.',
  })
  async rolesOrganization(
    @Args('rolesData') rolesData: RolesOrganizationInput
  ): Promise<ActorRoles> {
    return await this.rolesServices.getRolesForOrganization(rolesData);
  }

  @Query(() => ActorRoles, {
    description: 'The roles that the specified VirtualContributor has.',
  })
  async rolesVirtualContributor(
    @Args('rolesData') rolesData: RolesVirtualContributorInput
  ): Promise<ActorRoles> {
    return await this.rolesServices.getRolesForVirtualContributor(rolesData);
  }
}

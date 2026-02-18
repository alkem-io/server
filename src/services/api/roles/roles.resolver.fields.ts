import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CurrentActor } from '@src/common/decorators';
import { ActorRoles } from './dto/roles.dto.result.actor';
import { CommunityApplicationForRoleResult } from './dto/roles.dto.result.community.application';
import { CommunityInvitationForRoleResult } from './dto/roles.dto.result.community.invitation';
import { RolesResultOrganization } from './dto/roles.dto.result.organization';
import { RolesResultSpace } from './dto/roles.dto.result.space';
import { RolesService } from './roles.service';

@Resolver(() => ActorRoles)
export class RolesResolverFields {
  constructor(
    private rolesService: RolesService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @ResolveField('organizations', () => [RolesResultOrganization], {
    description: 'Details of the roles the contributor has in Organizations',
  })
  public async organizations(
    @Parent() roles: ActorRoles
  ): Promise<RolesResultOrganization[]> {
    return await this.rolesService.getOrganizationRolesForUser(roles);
  }

  @ResolveField('spaces', () => [RolesResultSpace], {
    description:
      'Details of Spaces the User or Organization is a member of, with child memberships - if Space is accessible for the current user.',
  })
  public async spaces(
    @CurrentActor() actorContext: ActorContext,
    @Parent() roles: ActorRoles
  ): Promise<RolesResultSpace[]> {
    return this.rolesService.getSpaceRolesForContributor(roles, actorContext);
  }

  @ResolveField('invitations', () => [CommunityInvitationForRoleResult], {
    description:
      'The invitations for the specified user; only accessible for platform admins',
  })
  public async invitations(
    @CurrentActor() actorContext: ActorContext,
    @Parent() roles: ActorRoles,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityInvitationForRoleResult[]> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `roles user query: ${actorContext.actorId}`
    );
    const invitations = await this.rolesService.getCommunityInvitationsForUser(
      roles.id,
      states
    );
    return await this.rolesService.convertInvitationsToRoleResults(invitations);
  }

  @ResolveField('applications', () => [CommunityApplicationForRoleResult], {
    description:
      'The applications for the specified user; only accessible for platform admins',
  })
  public async applications(
    @CurrentActor() actorContext: ActorContext,
    @Parent() roles: ActorRoles,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityApplicationForRoleResult[]> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `roles user query: ${actorContext.actorId}`
    );
    const applications =
      await this.rolesService.getCommunityApplicationsForUser(roles.id, states);
    return await this.rolesService.convertApplicationsToRoleResults(
      applications
    );
  }
}

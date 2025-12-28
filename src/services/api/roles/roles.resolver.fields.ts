import { Parent, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { Args, ResolveField } from '@nestjs/graphql';
import { ActorContext } from '@core/actor-context';
import { CommunityInvitationForRoleResult } from './dto/roles.dto.result.community.invitation';
import { RolesService } from './roles.service';
import { ActorRoles } from './dto/roles.dto.result.actor';
import { CommunityApplicationForRoleResult } from './dto/roles.dto.result.community.application';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums';
import { RolesResultOrganization } from './dto/roles.dto.result.organization';
import { RolesResultSpace } from './dto/roles.dto.result.space';

@Resolver(() => ActorRoles)
export class RolesResolverFields {
  constructor(
    private rolesService: RolesService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @ResolveField('organizations', () => [RolesResultOrganization], {
    description: 'Details of the roles the actor has in Organizations',
  })
  public async organizations(
    @Parent() roles: ActorRoles
  ): Promise<RolesResultOrganization[]> {
    return await this.rolesService.getOrganizationRoles(roles);
  }

  @ResolveField('spaces', () => [RolesResultSpace], {
    description:
      'Details of Spaces the actor is a member of, with child memberships - if Space is accessible for the current user.',
  })
  public async spaces(
    @CurrentUser() actorContext: ActorContext,
    @Parent() roles: ActorRoles
  ): Promise<RolesResultSpace[]> {
    return this.rolesService.getSpaceRoles(roles, actorContext);
  }

  @ResolveField('invitations', () => [CommunityInvitationForRoleResult], {
    description:
      'The invitations for the specified actor; only accessible for platform admins',
  })
  public async invitations(
    @CurrentUser() actorContext: ActorContext,
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
      `roles actor query: ${actorContext.actorId}`
    );
    const invitations = await this.rolesService.getCommunityInvitationsForUser(
      roles.id,
      states
    );
    return await this.rolesService.convertInvitationsToRoleResults(invitations);
  }

  @ResolveField('applications', () => [CommunityApplicationForRoleResult], {
    description:
      'The applications for the specified actor; only accessible for platform admins',
  })
  public async applications(
    @CurrentUser() actorContext: ActorContext,
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
      `roles actor query: ${actorContext.actorId}`
    );
    const applications =
      await this.rolesService.getCommunityApplicationsForUser(roles.id, states);
    return await this.rolesService.convertApplicationsToRoleResults(
      applications
    );
  }
}

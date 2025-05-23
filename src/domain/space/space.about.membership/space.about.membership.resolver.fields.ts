import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { SpaceAboutMembership } from './dto/space.about.membership';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { Inject } from '@nestjs/common';
import { RoleSetMembershipStatusDataLoader } from '@domain/access/role-set/role.set.data.loader.membership.status';
import { IForm } from '@domain/common/form/form.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IUser } from '@domain/community/user/user.interface';
import { RoleName } from '@common/enums/role.name';
import { IOrganization } from '@domain/community/organization';
import { UUID } from '@domain/common/scalars';

@Resolver(() => SpaceAboutMembership)
export class SpaceAboutMembershipResolverFields {
  constructor(
    private roleSetService: RoleSetService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(RoleSetMembershipStatusDataLoader)
    private readonly membershipStatusLoader: RoleSetMembershipStatusDataLoader
  ) {}

  @ResolveField('myPrivileges', () => [AuthorizationPrivilege], {
    nullable: true,
    description:
      'The privileges granted to the current user based on the Space membership policy.',
  })
  myPrivileges(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() membership: SpaceAboutMembership
  ): AuthorizationPrivilege[] {
    const authorization = membership.roleSet.authorization;

    return this.authorizationPolicyService.getAgentPrivileges(
      agentInfo,
      this.authorizationPolicyService.validateAuthorization(authorization)
    );
  }

  @ResolveField('roleSetID', () => UUID, {
    nullable: false,
    description: 'The identifier of the RoleSet within the Space.',
  })
  roleSetID(@Parent() membership: SpaceAboutMembership): string {
    return membership.roleSet.id;
  }

  @ResolveField('communityID', () => UUID, {
    nullable: false,
    description: 'The identifier of the Community within the Space.',
  })
  communityID(@Parent() membership: SpaceAboutMembership): string {
    return membership.community.id;
  }

  @ResolveField('applicationForm', () => IForm, {
    nullable: false,
    description: 'The Form used for Applications to this Space.',
  })
  async applicationForm(
    @Parent() membership: SpaceAboutMembership
  ): Promise<IForm> {
    const roleSet = membership.roleSet;
    return await this.roleSetService.getApplicationForm(roleSet);
  }

  @ResolveField('myMembershipStatus', () => CommunityMembershipStatus, {
    nullable: true,
    description: 'The membership status of the currently logged in user.',
  })
  async myMembershipStatus(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() membership: SpaceAboutMembership
  ): Promise<CommunityMembershipStatus> {
    const roleSet = membership.roleSet;
    // Uses the DataLoader to batch load membership statuses
    return this.membershipStatusLoader.loader.load({ agentInfo, roleSet });
  }

  @ResolveField('leadUsers', () => [IUser], {
    nullable: false,
    description: 'The Lead Users that are associated with this Space.',
  })
  public async leadUsers(
    @Parent() membership: SpaceAboutMembership
  ): Promise<IUser[]> {
    const roleSet = membership.roleSet;
    return await this.roleSetService.getUsersWithRole(roleSet, RoleName.LEAD);
  }

  @ResolveField('leadOrganizations', () => [IOrganization], {
    nullable: false,
    description: 'The Lead Organizations that are associated with this Space.',
  })
  public async leadOrganizations(
    @Parent() membership: SpaceAboutMembership
  ): Promise<IOrganization[]> {
    const roleSet = membership.roleSet;
    return await this.roleSetService.getOrganizationsWithRole(
      roleSet,
      RoleName.LEAD
    );
  }
}

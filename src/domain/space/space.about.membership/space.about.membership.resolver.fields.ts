import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { SpaceAboutMembership } from './dto/space.about.membership';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { Inject, UseGuards } from '@nestjs/common';
import { RoleSetMembershipStatusDataLoader } from '@domain/access/role-set/role.set.data.loader.membership.status';
import { IForm } from '@domain/common/form/form.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IUser } from '@domain/community/user/user.interface';
import { RoleName } from '@common/enums/role.name';
import { IOrganization } from '@domain/community/organization';

@Resolver(() => SpaceAboutMembership)
export class SpaceAboutMembershipResolverFields {
  constructor(
    private roleSetService: RoleSetService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(RoleSetMembershipStatusDataLoader)
    private readonly membershipStatusLoader: RoleSetMembershipStatusDataLoader
  ) {}

  @UseGuards(GraphqlGuard)
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

  @UseGuards(GraphqlGuard)
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

  @UseGuards(GraphqlGuard)
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

  @UseGuards(GraphqlGuard)
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

  @UseGuards(GraphqlGuard)
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

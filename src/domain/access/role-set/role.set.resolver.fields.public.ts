import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { RoleSetService } from './role.set.service';
import { IForm } from '@domain/common/form/form.interface';
import { IRoleSet } from './role.set.interface';
import { RoleSet } from './role.set.entity';
import { RoleName } from '@common/enums/role.name';
import { IRole } from '../role/role.interface';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { RoleSetRoleImplicit } from '@common/enums/role.set.role.implicit';

// Resolver for fields on RoleSet that are available without READ access
@Resolver(() => IRoleSet)
export class RoleSetResolverFieldsPublic {
  constructor(private roleSetService: RoleSetService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('applicationForm', () => IForm, {
    nullable: false,
    description: 'The Form used for Applications to this roleSet.',
  })
  async applicationForm(@Parent() roleSet: RoleSet): Promise<IForm> {
    return await this.roleSetService.getApplicationForm(roleSet);
  }

  // Role definitions are not protected
  @UseGuards(GraphqlGuard)
  @ResolveField('roleDefinitions', () => [IRole], {
    nullable: false,
    description: 'The Role Definitions included in this roleSet.',
  })
  async roleDefinitions(
    @Parent() roleSet: RoleSet,
    @Args('roles', { type: () => [RoleName], nullable: true })
    roles: RoleName[] | undefined
  ): Promise<IRole[]> {
    return await this.roleSetService.getRoleDefinitions(roleSet, roles);
  }

  // The set of fields from here down are not prote
  @UseGuards(GraphqlGuard)
  @ResolveField('roleDefinition', () => IRole, {
    nullable: false,
    description: 'The Role Definitions from this RoleSet to return.',
  })
  async roleDefinition(
    @Parent() roleSet: RoleSet,
    @Args('role', { type: () => RoleName, nullable: false })
    role: RoleName
  ): Promise<IRole> {
    return await this.roleSetService.getRoleDefinition(roleSet, role);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('roleNames', () => [RoleName], {
    nullable: false,
    description: 'The Roles available in this roleSet.',
  })
  async roleNames(@Parent() roleSet: RoleSet): Promise<RoleName[]> {
    return (await this.roleSetService.getRoleDefinitions(roleSet)).map(
      role => role.name
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myMembershipStatus', () => CommunityMembershipStatus, {
    nullable: true,
    description: 'The membership status of the currently logged in user.',
  })
  async myMembershipStatus(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() roleSet: IRoleSet
  ): Promise<CommunityMembershipStatus> {
    return this.roleSetService.getMembershipStatus(agentInfo, roleSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRoles', () => [RoleName], {
    nullable: false,
    description:
      'The roles on this community for the currently logged in user.',
  })
  async myRoles(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() roleSet: IRoleSet
  ): Promise<RoleName[]> {
    return this.roleSetService.getRolesForAgentInfo(agentInfo, roleSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRolesImplicit', () => [RoleSetRoleImplicit], {
    nullable: false,
    description:
      'The implicit roles on this community for the currently logged in user.',
  })
  async myRolesImplicit(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() roleSet: IRoleSet
  ): Promise<RoleSetRoleImplicit[]> {
    return this.roleSetService.getImplicitRoles(agentInfo, roleSet);
  }
}

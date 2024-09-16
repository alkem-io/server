import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver, Args } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from './community.service';
import { IUserGroup } from '@domain/community/user-group';
import { AuthorizationPrivilege } from '@common/enums';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ICommunityGuidelines } from '../community-guidelines/community.guidelines.interface';
import { IRoleSet } from '@domain/access/role-set';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CommunityRoleImplicit } from '@common/enums/community.role.implicit';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CommunityRoleType } from '@common/enums/community.role';

@Resolver(() => ICommunity)
export class CommunityResolverFields {
  constructor(
    private communityService: CommunityService,
    private roleSetService: RoleSetService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: false,
    description: 'Groups of users related to a Community.',
  })
  @Profiling.api
  async groups(@Parent() community: Community) {
    return await this.communityService.getUserGroups(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: false,
    description: 'The user group with the specified id anywhere in the space',
  })
  async group(
    @Parent() community: ICommunity,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    return await this.communityService.getUserGroup(community, groupID);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('communication', () => ICommunication, {
    nullable: false,
    description: 'The Communications for this Community.',
  })
  @Profiling.api
  async communication(@Parent() community: Community) {
    return await this.communityService.getCommunication(community.id, {
      communication: { updates: true },
    });
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('roleSet', () => IRoleSet, {
    nullable: false,
    description: 'The RoleSet for this Community.',
  })
  async policy(@Parent() community: Community): Promise<IRoleSet> {
    return this.communityService.getRoleSet(community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('guidelines', () => ICommunityGuidelines, {
    nullable: false,
    description: 'The guidelines for members of this Community.',
  })
  async guidelines(
    @Parent() community: ICommunity
  ): Promise<ICommunityGuidelines> {
    return await this.communityService.getCommunityGuidelines(community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myMembershipStatus', () => CommunityMembershipStatus, {
    nullable: true,
    description: 'The membership status of the currently logged in user.',
  })
  async myMembershipStatus(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: ICommunity
  ): Promise<CommunityMembershipStatus> {
    return this.roleSetService.getMembershipStatus(agentInfo, community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRoles', () => [CommunityRoleType], {
    nullable: false,
    description:
      'The roles on this community for the currently logged in user.',
  })
  async myRoles(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: ICommunity
  ): Promise<CommunityRoleType[]> {
    return this.roleSetService.getCommunityRoles(agentInfo, community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRolesImplicit', () => [CommunityRoleImplicit], {
    nullable: false,
    description:
      'The implicit roles on this community for the currently logged in user.',
  })
  async myRolesImplicit(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: ICommunity
  ): Promise<CommunityRoleImplicit[]> {
    return this.roleSetService.getCommunityImplicitRoles(agentInfo, community);
  }
}

import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from './community.service';
import { IUser } from '@domain/community/user';
import { IUserGroup } from '@domain/community/user-group';
import { IApplication } from '@domain/community/application';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication/agent-info';
import { CommunityRoom } from '@services/platform/communication';
@Resolver(() => ICommunity)
export class CommunityResolverFields {
  constructor(private communityService: CommunityService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups of users related to a Community.',
  })
  @Profiling.api
  async groups(@Parent() community: Community) {
    return await this.communityService.getUserGroups(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'All users that are contributing to this Community.',
  })
  @Profiling.api
  async members(@Parent() community: Community) {
    return await this.communityService.getMembers(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [IApplication], {
    nullable: false,
    description: 'Application available for this community.',
  })
  @Profiling.api
  async applications(@Parent() community: Community) {
    const apps = await this.communityService.getApplications(community);
    return apps || [];
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('updatesRoom', () => CommunityRoom, {
    nullable: false,
    description: 'Room with messages for this community.',
  })
  @Profiling.api
  async updatesRoom(
    @Parent() community: Community,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunityRoom> {
    return await this.communityService.getUpdatesCommunicationsRoom(
      community,
      agentInfo.email
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('discussionRoom', () => CommunityRoom, {
    nullable: false,
    description: 'Room with messages for this community.',
  })
  @Profiling.api
  async discussionRoom(
    @Parent() community: Community,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunityRoom> {
    return await this.communityService.getDiscussionCommunicationsRoom(
      community,
      agentInfo.email
    );
  }
}

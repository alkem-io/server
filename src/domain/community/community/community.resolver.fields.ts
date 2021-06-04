import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from './community.service';
import { IUser } from '@domain/community/user';
import { IUserGroup } from '@domain/community/user-group';
import { IApplication } from '@domain/community/application';
import { AgentInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';

@Resolver(() => ICommunity)
export class CommunityResolverFields {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private communityService: CommunityService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups of users related to a Community.',
  })
  @Profiling.api
  async groups(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: Community
  ) {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      community.authorization,
      `groups on Community: ${community.displayName}`
    );
    return await this.communityService.getUserGroups(community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'All users that are contributing to this Community.',
  })
  @Profiling.api
  async members(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: Community
  ) {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      community.authorization,
      `members on Community: ${community.displayName}`
    );
    return await this.communityService.getMembers(community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [IApplication], {
    nullable: false,
    description: 'Application available for this community.',
  })
  @Profiling.api
  async applications(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: Community
  ) {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      community.authorization,
      `members on Community: ${community.displayName}`
    );
    const apps = await this.communityService.getApplications(community);
    return apps || [];
  }
}

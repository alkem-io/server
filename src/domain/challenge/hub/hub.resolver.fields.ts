import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { IProject } from '@domain/collaboration/project';
import { INVP } from '@domain/common/nvp';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { ITagset } from '@domain/common/tagset';
import { IOrganization } from '@domain/community';
import { IApplication } from '@domain/community/application';
import { ApplicationService } from '@domain/community/application/application.service';
import { ICommunity } from '@domain/community/community';
import { IUserGroup } from '@domain/community/user-group';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IContext } from '@domain/context/context';
import { UseGuards } from '@nestjs/common';
import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { HubService } from '@domain/challenge/hub/hub.service';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { IAgent } from '@domain/agent/agent';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { ITemplatesSet } from '@domain/template/templates-set';

@Resolver(() => IHub)
export class HubResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private groupService: UserGroupService,
    private applicationService: ApplicationService,
    private preferenceSetService: PreferenceSetService,
    private hubService: HubService
  ) {}

  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description:
      'Get a Community within the Hub. Defaults to the Community for the Hub itself.',
  })
  @Profiling.api
  async community(
    @Parent() hub: Hub,
    @Args('ID', { type: () => UUID, nullable: true }) ID: string
  ) {
    // Default to returning the community for the Hub
    if (!ID) {
      return await this.hubService.getCommunity(hub);
    }
    return await this.hubService.getCommunityInNameableScope(ID, hub);
  }

  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the hub.',
  })
  @Profiling.api
  async context(@Parent() hub: Hub) {
    return await this.hubService.getContext(hub);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this Hub.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async agent(@Parent() hub: Hub): Promise<IAgent> {
    return await this.hubService.getAgent(hub.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('templates', () => ITemplatesSet, {
    nullable: true,
    description: 'The templates in use by this Hub',
  })
  @UseGuards(GraphqlGuard)
  async templatesSet(@Parent() hub: Hub): Promise<ITemplatesSet> {
    return await this.hubService.getTemplatesSetOrFail(hub.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('preferences', () => [IPreference], {
    nullable: false,
    description: 'The preferences for this Hub',
  })
  @UseGuards(GraphqlGuard)
  async preferences(@Parent() hub: Hub): Promise<IPreference[]> {
    const preferenceSet = await this.hubService.getPreferenceSetOrFail(hub.id);
    return this.preferenceSetService.getPreferencesOrFail(preferenceSet);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('challenges', () => [IChallenge], {
    nullable: true,
    description: 'The challenges for the hub.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async challenges(
    @Parent() hub: Hub,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Challenges to return; if omitted return all Challenges.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return the Challenges based on a random selection.',
      nullable: true,
    })
    shuffle: boolean
  ) {
    return await this.hubService.getChallenges(hub, limit, shuffle);
  }

  @ResolveField('tagset', () => ITagset, {
    nullable: true,
    description: 'The set of tags for the  hub.',
  })
  @Profiling.api
  async tagset(@Parent() hub: Hub) {
    return hub.tagset;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('challenge', () => IChallenge, {
    nullable: false,
    description: 'A particular Challenge, either by its ID or nameID',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async challenge(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @Parent() hub: Hub
  ): Promise<IChallenge> {
    return await this.hubService.getChallengeInNameableScope(id, hub);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('opportunities', () => [IOpportunity], {
    nullable: false,
    description: 'All opportunities within the hub',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async opportunities(@Parent() hub: Hub): Promise<IOpportunity[]> {
    return await this.hubService.getOpportunitiesInNameableScope(hub);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('opportunity', () => IOpportunity, {
    nullable: false,
    description: 'A particular Opportunity, either by its ID or nameID',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async opportunity(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @Parent() hub: Hub
  ): Promise<IOpportunity> {
    return await this.hubService.getOpportunityInNameableScope(id, hub);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('projects', () => [IProject], {
    nullable: false,
    description: 'All projects within this hub',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async projects(@Parent() hub: Hub): Promise<IProject[]> {
    return await this.hubService.getProjects(hub);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('project', () => IProject, {
    nullable: false,
    description: 'A particular Project, identified by the ID',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async project(
    @Parent() hub: Hub,
    @Args('ID', { type: () => UUID_NAMEID }) projectID: string
  ): Promise<IProject> {
    return await this.hubService.getProjectInNameableScope(projectID, hub);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: false,
    description: 'The User Groups on this Hub',
  })
  @Profiling.api
  async groups(@Parent() hub: Hub): Promise<IUserGroup[]> {
    return await this.groupService.getGroups({
      hubID: hub.id,
    });
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groupsWithTag', () => [IUserGroup], {
    nullable: false,
    description: 'All groups on this Hub that have the provided tag',
  })
  @Profiling.api
  async groupsWithTag(
    @Parent() hub: Hub,
    @Args('tag') tag: string
  ): Promise<IUserGroup[]> {
    return await this.groupService.getGroupsWithTag(tag, {
      hubID: hub.id,
    });
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: false,
    description: 'The user group with the specified id anywhere in the hub',
  })
  @Profiling.api
  async group(
    @Parent() hub: Hub,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    return await this.groupService.getUserGroupOrFail(groupID, {
      where: { hubID: hub.id },
    });
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('application', () => IApplication, {
    nullable: false,
    description: 'A particular User Application within this Hub.',
  })
  async application(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() hub: Hub,
    @Args('ID', { type: () => UUID }) applicationID: string
  ): Promise<IApplication> {
    const application = await this.applicationService.getApplicationOrFail(
      applicationID,
      {
        where: { hubID: hub.id },
      }
    );
    // Check the user can access this particular application
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      application.authorization,
      AuthorizationPrivilege.READ,
      `read application: ${application.id} on hub ${hub.nameID}`
    );
    return application;
  }

  @ResolveField('activity', () => [INVP], {
    nullable: true,
    description: 'The activity within this Hub.',
  })
  @Profiling.api
  async activity(@Parent() hub: Hub) {
    return await this.hubService.getActivity(hub);
  }

  @ResolveField('host', () => IOrganization, {
    nullable: true,
    description: 'The Hub host.',
  })
  @Profiling.api
  async host(@Parent() hub: Hub): Promise<IOrganization | undefined> {
    return await this.hubService.getHost(hub.id);
  }
}

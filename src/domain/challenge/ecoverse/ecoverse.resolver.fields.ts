import { GraphqlGuard } from '@core/authorization';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { IProject } from '@domain/collaboration/project';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { IUserGroup } from '@domain/community/user-group';
import { ApplicationService } from '@domain/community/application/application.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { IChallenge } from '../challenge';
import { EcoverseService } from './ecoverse.service';
import { IEcoverse } from '@domain/challenge/ecoverse';
import { ICommunity } from '@domain/community/community';
import { IContext } from '@domain/context/context';
import { ITagset } from '@domain/common/tagset';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { IApplication } from '@domain/community/application';
import { INVP } from '@domain/common/nvp';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege } from '@common/enums';

@Resolver(() => IEcoverse)
export class EcoverseResolverFields {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private projectService: ProjectService,
    private groupService: UserGroupService,
    private applicationService: ApplicationService,
    private ecoverseService: EcoverseService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the ecoverse.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async community(@Parent() ecoverse: Ecoverse) {
    return await this.ecoverseService.getCommunity(ecoverse);
  }

  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the ecoverse.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async context(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse
  ) {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `context on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.ecoverseService.getContext(ecoverse);
  }

  @ResolveField('challenges', () => [IChallenge], {
    nullable: true,
    description: 'The challenges for the ecoverse.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async challenges(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse
  ) {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `challenges on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.ecoverseService.getChallenges(ecoverse);
  }

  @ResolveField('tagset', () => ITagset, {
    nullable: true,
    description: 'The set of tags for the  ecoverse.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async tagset(@Parent() ecoverse: Ecoverse) {
    return ecoverse.tagset;
  }

  @ResolveField('challenge', () => IChallenge, {
    nullable: false,
    description: 'A particular Challenge, either by its ID or nameID',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async challenge(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse
  ): Promise<IChallenge> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `challenge on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.ecoverseService.getChallengeInNameableScope(id, ecoverse);
  }

  @ResolveField('opportunities', () => [IOpportunity], {
    nullable: false,
    description: 'All opportunities within the ecoverse',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async opportunities(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse
  ): Promise<IOpportunity[]> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `opportunities on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.ecoverseService.getOpportunitiesInNameableScope(ecoverse);
  }

  @ResolveField('opportunity', () => IOpportunity, {
    nullable: false,
    description: 'A particular Opportunity, either by its ID or nameID',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async opportunity(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse
  ): Promise<IOpportunity> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `opportunity on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.ecoverseService.getOpportunityInNameableScope(
      id,
      ecoverse
    );
  }

  @ResolveField('projects', () => [IProject], {
    nullable: false,
    description: 'All projects within this ecoverse',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async projects(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse
  ): Promise<IProject[]> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `projects on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.ecoverseService.getProjects(ecoverse);
  }

  @ResolveField('project', () => IProject, {
    nullable: false,
    description: 'A particular Project, identified by the ID',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async project(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse,
    @Args('ID', { type: () => UUID_NAMEID }) projectID: string
  ): Promise<IProject> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `project on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.projectService.getProjectOrFail(projectID, {
      where: { ecoverseID: ecoverse.id },
    });
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: false,
    description: 'The User Groups on this Ecoverse',
  })
  @Profiling.api
  async groups(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse
  ): Promise<IUserGroup[]> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `groups on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.groupService.getGroups({
      ecoverseID: ecoverse.id,
    });
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('groupsWithTag', () => [IUserGroup], {
    nullable: false,
    description: 'All groups on this Ecoverse that have the provided tag',
  })
  @Profiling.api
  async groupsWithTag(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse,
    @Args('tag') tag: string
  ): Promise<IUserGroup[]> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `groups with tag on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.groupService.getGroupsWithTag(tag, {
      ecoverseID: ecoverse.id,
    });
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: false,
    description:
      'The user group with the specified id anywhere in the ecoverse',
  })
  @Profiling.api
  async group(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `group on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.groupService.getUserGroupOrFail(groupID, {
      where: { ecoverseID: ecoverse.id },
    });
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('application', () => IApplication, {
    nullable: false,
    description: 'All applications to join',
  })
  async application(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() ecoverse: Ecoverse,
    @Args('ID', { type: () => UUID }) applicationID: string
  ): Promise<IApplication> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      ecoverse.authorization,
      `applications on Ecoverse: ${ecoverse.nameID}`
    );
    return await this.applicationService.getApplicationOrFail(applicationID, {
      where: { ecoverseID: ecoverse.id },
    });
  }

  @ResolveField('activity', () => [INVP], {
    nullable: true,
    description: 'The activity within this Ecoverse.',
  })
  @Profiling.api
  async activity(@Parent() ecoverse: Ecoverse) {
    return await this.ecoverseService.getActivity(ecoverse);
  }
}

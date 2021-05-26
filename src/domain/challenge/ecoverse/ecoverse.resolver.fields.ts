import { AuthorizationGlobalRoles } from '@common/decorators';
import { AuthorizationRoleGlobal } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { IProject } from '@domain/collaboration/project';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { IUserGroup } from '@domain/community/user-group';
import { ApplicationService } from '@domain/community/application/application.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { Inject, UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IChallenge } from '../challenge';
import { EcoverseService } from './ecoverse.service';
import { IEcoverse } from '@domain/challenge/ecoverse';
import { ICommunity } from '@domain/community/community';
import { IContext } from '@domain/context/context';
import { ITagset } from '@domain/common/tagset';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { IApplication } from '@domain/community/application';
import { INVP } from '@domain/common/nvp';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@Resolver(() => IEcoverse)
export class EcoverseResolverFields {
  constructor(
    private projectService: ProjectService,
    private groupService: UserGroupService,
    private applicationService: ApplicationService,
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the ecoverse.',
  })
  @Profiling.api
  async community(@Parent() ecoverse: Ecoverse) {
    return await this.ecoverseService.getCommunity(ecoverse);
  }

  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the ecoverse.',
  })
  @Profiling.api
  async context(@Parent() ecoverse: Ecoverse) {
    return await this.ecoverseService.getContext(ecoverse);
  }

  @ResolveField('challenges', () => [IChallenge], {
    nullable: true,
    description: 'The challenges for the ecoverse.',
  })
  @Profiling.api
  async challenges(@Parent() ecoverse: Ecoverse) {
    return await this.ecoverseService.getChallenges(ecoverse);
  }

  @ResolveField('tagset', () => ITagset, {
    nullable: true,
    description: 'The set of tags for the  ecoverse.',
  })
  @Profiling.api
  async tagset(@Parent() ecoverse: Ecoverse) {
    return this.ecoverseService.getContainedChallenge(ecoverse).tagset;
  }

  @ResolveField('challenge', () => IChallenge, {
    nullable: false,
    description: 'A particular Challenge, either by its ID or nameID',
  })
  @Profiling.api
  async challenge(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @Parent() ecoverse: Ecoverse
  ): Promise<IChallenge> {
    return await this.ecoverseService.getChallengeInNameableScope(id, ecoverse);
  }

  @ResolveField('opportunities', () => [IOpportunity], {
    nullable: false,
    description: 'All opportunities within the ecoverse',
  })
  @Profiling.api
  async opportunities(@Parent() ecoverse: Ecoverse): Promise<IOpportunity[]> {
    return await this.ecoverseService.getOpportunitiesInNameableScope(ecoverse);
  }

  @ResolveField('opportunity', () => IOpportunity, {
    nullable: false,
    description: 'A particular Opportunity, either by its ID or nameID',
  })
  @Profiling.api
  async opportunity(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @Parent() ecoverse: Ecoverse
  ): Promise<IOpportunity> {
    return await this.ecoverseService.getOpportunityInNameableScope(
      id,
      ecoverse
    );
  }

  @ResolveField('projects', () => [IProject], {
    nullable: false,
    description: 'All projects within this ecoverse',
  })
  @Profiling.api
  async projects(@Parent() ecoverse: Ecoverse): Promise<IProject[]> {
    return await this.ecoverseService.getProjects(ecoverse);
  }

  @ResolveField('project', () => IProject, {
    nullable: false,
    description: 'A particular Project, identified by the ID',
  })
  @Profiling.api
  async project(
    @Parent() ecoverse: Ecoverse,
    @Args('ID', { type: () => UUID_NAMEID }) projectID: string
  ): Promise<IProject> {
    return await this.projectService.getProjectOrFail(projectID, {
      where: { ecoverseID: ecoverse.id },
    });
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: false,
    description: 'The User Groups on this Ecoverse',
  })
  @Profiling.api
  async groups(@Parent() ecoverse: Ecoverse): Promise<IUserGroup[]> {
    return await this.groupService.getGroups({
      ecoverseID: ecoverse.id,
    });
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('groupsWithTag', () => [IUserGroup], {
    nullable: false,
    description: 'All groups on this Ecoverse that have the provided tag',
  })
  @Profiling.api
  async groupsWithTag(
    @Parent() ecoverse: Ecoverse,
    @Args('tag') tag: string
  ): Promise<IUserGroup[]> {
    return await this.groupService.getGroupsWithTag(tag, {
      ecoverseID: ecoverse.id,
    });
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: false,
    description:
      'The user group with the specified id anywhere in the ecoverse',
  })
  @Profiling.api
  async group(
    @Parent() ecoverse: Ecoverse,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    return await this.groupService.getUserGroupOrFail(groupID, {
      where: { ecoverseID: ecoverse.id },
    });
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.Registered,
    AuthorizationRoleGlobal.CommunityAdmin
  )
  @UseGuards(GraphqlGuard)
  @ResolveField('application', () => IApplication, {
    nullable: false,
    description: 'All applications to join',
  })
  async application(
    @Parent() ecoverse: Ecoverse,
    @Args('ID', { type: () => UUID }) applicationID: string
  ): Promise<IApplication> {
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

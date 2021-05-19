import { Inject, UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import { ICommunity } from '@domain/community/community';
import { ChallengeService } from '../challenge/challenge.service';
import { IChallenge } from '@domain/challenge/challenge';
import { IProject } from '@domain/collaboration/project';
import { IUserGroup, IApplication } from '@domain/community';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { AuthorizationRolesGlobal, GraphqlGuard } from '@core/authorization';
import { ITagset } from '@domain/common/tagset';
import { IContext } from '@domain/context/context';
import { INVP } from '@domain/common/nvp';
import { IEcoverse, Ecoverse } from '@domain/challenge/ecoverse';
@Resolver(() => IEcoverse)
export class EcoverseResolverFields {
  constructor(
    private challengeService: ChallengeService,
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
    return this.ecoverseService.getChallenge(ecoverse).tagset;
  }

  @ResolveField('challenge', () => IChallenge, {
    nullable: false,
    description: 'A particular Challenge, either by its ID or textID',
  })
  @Profiling.api
  async challenge(
    @Parent() ecoverse: Ecoverse,
    @Args('ID') id: string
  ): Promise<IChallenge> {
    return await this.challengeService.getChallengeOrFail(id, {
      where: { ecoverseID: ecoverse.id.toString() },
    });
  }

  @ResolveField('opportunities', () => [IChallenge], {
    nullable: false,
    description: 'All opportunities within the ecoverse',
  })
  @Profiling.api
  async opportunities(@Parent() ecoverse: Ecoverse): Promise<IChallenge[]> {
    return await this.ecoverseService.getOpportunities(ecoverse);
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
    @Args('ID') projectID: string
  ): Promise<IProject> {
    return await this.projectService.getProjectOrFail(projectID, {
      where: { ecoverseID: ecoverse.id.toString() },
    });
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: false,
    description: 'The User Groups on this Ecoverse',
  })
  @Profiling.api
  async groups(@Parent() ecoverse: Ecoverse): Promise<IUserGroup[]> {
    return await this.groupService.getGroups({
      ecoverseID: ecoverse.id.toString(),
    });
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
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
      ecoverseID: ecoverse.id.toString(),
    });
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: false,
    description:
      'The user group with the specified id anywhere in the ecoverse',
  })
  @Profiling.api
  async group(
    @Parent() ecoverse: Ecoverse,
    @Args('ID') groupID: string
  ): Promise<IUserGroup> {
    return await this.groupService.getUserGroupOrFail(groupID, {
      where: { ecoverseID: ecoverse.id.toString() },
    });
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.Registered,
    AuthorizationRolesGlobal.CommunityAdmin
  )
  @UseGuards(GraphqlGuard)
  @ResolveField('application', () => IApplication, {
    nullable: false,
    description: 'All applications to join',
  })
  async application(
    @Parent() ecoverse: Ecoverse,
    @Args('ID') applicationID: number
  ): Promise<IApplication> {
    return await this.applicationService.getApplicationOrFail(applicationID, {
      where: { ecoverseID: ecoverse.id.toString() },
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

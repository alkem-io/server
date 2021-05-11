import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Inject, UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import { Community } from '@domain/community/community';
import { Challenge } from '../challenge/challenge.entity';
import { ChallengeService } from '../challenge/challenge.service';
import { IChallenge } from '../challenge';
import { IOpportunity, Opportunity } from '../opportunity';
import { OpportunityService } from '../opportunity/opportunity.service';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Project, IProject } from '@domain/collaboration/project';
import {
  UserGroup,
  IUserGroup,
  Application,
  IApplication,
} from '@domain/community';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { AuthorizationGlobalRoles } from '@common/decorators';
import {
  AuthorizationEcoverseMember,
  AuthorizationRolesGlobal,
  GraphqlGuard,
} from '@core/authorization';
@Resolver(() => Ecoverse)
export class EcoverseResolverFields {
  constructor(
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private projectService: ProjectService,
    private groupService: UserGroupService,
    private applicationService: ApplicationService,
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.Admin,
    AuthorizationRolesGlobal.CommunityAdmin
  )
  @AuthorizationEcoverseMember()
  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => Community, {
    nullable: true,
    description: 'The community for the ecoverse.',
  })
  @Profiling.api
  async community(@Parent() ecoverse: Ecoverse) {
    const community = await this.ecoverseService.getCommunity(ecoverse.id);
    return community;
  }

  @ResolveField('challenges', () => [Challenge], {
    nullable: true,
    description: 'The challenges for the ecoverse.',
  })
  @Profiling.api
  async challenges(@Parent() ecoverse: Ecoverse) {
    const challenges = await this.ecoverseService.getChallenges(ecoverse);
    return challenges;
  }

  @ResolveField('challenge', () => Challenge, {
    nullable: false,
    description: 'A particular Challenge, either by its ID or textID',
  })
  @Profiling.api
  async challenge(@Args('ID') id: string): Promise<IChallenge> {
    return await this.challengeService.getChallengeOrFail(id);
  }

  @ResolveField('opportunities', () => [Opportunity], {
    nullable: false,
    description: 'All opportunities within the ecoverse',
  })
  @Profiling.api
  async opportunities(@Parent() ecoverse: Ecoverse): Promise<IOpportunity[]> {
    return await this.ecoverseService.getOpportunities(ecoverse);
  }

  @ResolveField('opportunity', () => Opportunity, {
    nullable: false,
    description: 'A particular opportunitiy, identified by the ID or textID',
  })
  @Profiling.api
  async opportunity(@Args('ID') id: string): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(id);
    if (opportunity) return opportunity;

    throw new EntityNotFoundException(
      `Unable to locate opportunity with given id: ${id}`,
      LogContext.CHALLENGES
    );
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('projects', () => [Project], {
    nullable: false,
    description: 'All projects within this ecoverse',
  })
  @Profiling.api
  async projects(): Promise<IProject[]> {
    return await this.projectService.getProjects();
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('project', () => Project, {
    nullable: false,
    description: 'A particular Project, identified by the ID',
  })
  @Profiling.api
  async project(@Args('ID') id: string): Promise<IProject> {
    return await this.projectService.getProjectOrFail(id);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [UserGroup], {
    nullable: false,
    description: 'The User Groups on this Ecoverse',
  })
  @Profiling.api
  async groups(): Promise<IUserGroup[]> {
    return await this.groupService.getGroups();
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('groupsWithTag', () => [UserGroup], {
    nullable: false,
    description: 'All groups on this Ecoverse that have the provided tag',
  })
  @Profiling.api
  async groupsWithTag(@Args('tag') tag: string): Promise<IUserGroup[]> {
    return await this.groupService.getGroupsWithTag(tag);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => UserGroup, {
    nullable: false,
    description:
      'The user group with the specified id anywhere in the ecoverse',
  })
  @Profiling.api
  async group(@Args('ID') id: string): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(id, {
      relations: ['members'],
    });
    return group;
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.Registered,
    AuthorizationRolesGlobal.CommunityAdmin
  )
  @UseGuards(GraphqlGuard)
  @ResolveField('application', () => Application, {
    nullable: false,
    description: 'All applications to join',
  })
  async application(@Args('ID') id: number): Promise<IApplication> {
    return await this.applicationService.getApplicationOrFail(id);
  }
}

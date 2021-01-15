import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Float, Mutation } from '@nestjs/graphql/dist';
import { Roles } from '@utils/decorators/roles.decorator';
import { GqlAuthGuard } from '@utils/authentication/graphql.guard';
import {
  RestrictedGroupNames,
  UserGroup,
} from '@domain/user-group/user-group.entity';
import { OpportunityInput } from './opportunity.dto';
import { Opportunity } from './opportunity.entity';
import { IOpportunity } from './opportunity.interface';
import { OpportunityService } from './opportunity.service';
import { Args, Query } from '@nestjs/graphql';
import { AspectInput } from '@domain/aspect/aspect.dto';
import { IAspect } from '@domain/aspect/aspect.interface';
import { Aspect } from '@domain/aspect/aspect.entity';
import { ActorGroupInput } from '@domain/actor-group/actor-group.dto';
import { IActorGroup } from '@domain/actor-group/actor-group.interface';
import { ActorGroup } from '@domain/actor-group/actor-group.entity';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { IRelation } from '@domain/relation/relation.interface';
import { RelationInput } from '@domain/relation/relation.dto';
import { Relation } from '@domain/relation/relation.entity';
import { IUserGroup } from '@domain/user-group/user-group.interface';
import { ProjectInput } from '@domain/project/project.dto';
import { Project } from '@domain/project/project.entity';
import { IProject } from '@domain/project/project.interface';
import { EntityNotFoundException } from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';

@Resolver()
export class OpportunityResolver {
  constructor(private opportunityService: OpportunityService) {}

  @Query(() => [Opportunity], {
    nullable: false,
    description: 'All opportunities within the ecoverse',
  })
  @Profiling.api
  async opportunities(): Promise<IOpportunity[]> {
    return await this.opportunityService.getOpportunites();
  }

  @Query(() => Opportunity, {
    nullable: false,
    description: 'A particular opportunitiy, identified by the ID',
  })
  @Profiling.api
  async opportunity(@Args('ID') id: number): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(id);
    if (opportunity) return opportunity;

    throw new EntityNotFoundException(
      `Unable to locate opportunity with given id: ${id}`,
      LogContext.CHALLENGES
    );
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Opportunity, {
    description:
      'Updates the specified Opportunity with the provided data (merge)',
  })
  @Profiling.api
  async updateOpportunity(
    @Args({ name: 'ID', type: () => Float }) opportunityID: number,
    @Args('opportunityData') opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    const Opportunity = await this.opportunityService.updateOpportunity(
      opportunityID,
      opportunityData
    );
    return Opportunity;
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the Opportunity with the specified ID',
  })
  async removeOpportunity(@Args('ID') opportunityID: number): Promise<boolean> {
    return await this.opportunityService.removeOpportunity(opportunityID);
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
    description: 'Create a new Project on the Opportunity identified by the ID',
  })
  @Profiling.api
  async createProject(
    @Args('opportunityID') opportunityId: number,
    @Args('projectData') projectData: ProjectInput
  ): Promise<IProject> {
    const project = await this.opportunityService.createProject(
      opportunityId,
      projectData
    );
    return project;
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new aspect on the Opportunity identified by the ID',
  })
  @Profiling.api
  async createAspect(
    @Args('opportunityID') opportunityId: number,
    @Args('aspectData') aspectData: AspectInput
  ): Promise<IAspect> {
    const aspect = await this.opportunityService.createAspect(
      opportunityId,
      aspectData
    );
    return aspect;
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => ActorGroup, {
    description:
      'Create a new actor group on the Opportunity identified by the ID',
  })
  @Profiling.api
  async createActorGroup(
    @Args('opportunityID') opportunityId: number,
    @Args('actorGroupData') actorGroupData: ActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup = await this.opportunityService.createActorGroup(
      opportunityId,
      actorGroupData
    );
    return actorGroup;
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Relation, {
    description:
      'Create a new relation on the Opportunity identified by the ID',
  })
  @Profiling.api
  async createRelation(
    @Args('opportunityID') opportunityId: number,
    @Args('relationData') relationData: RelationInput
  ): Promise<IRelation> {
    return await this.opportunityService.createRelation(
      opportunityId,
      relationData
    );
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Creates a new user group for the opportunity with the given id',
  })
  @Profiling.api
  async createGroupOnOpportunity(
    @Args({ name: 'opportunityID', type: () => Float }) opportunityID: number,
    @Args({ name: 'groupName', type: () => String }) groupName: string
  ): Promise<IUserGroup> {
    const group = await this.opportunityService.createUserGroup(
      opportunityID,
      groupName
    );
    return group;
  }
}

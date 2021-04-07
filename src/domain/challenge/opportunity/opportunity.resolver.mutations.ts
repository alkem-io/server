import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Opportunity } from './opportunity.entity';
import { IOpportunity } from './opportunity.interface';
import { OpportunityService } from './opportunity.service';
import { CreateAspectInput } from '@domain/context/aspect';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { Aspect } from '@domain/context/aspect/aspect.entity';
import { CreateActorGroupInput } from '@domain/context/actor-group';
import { IActorGroup } from '@domain/context/actor-group/actor-group.interface';
import { ActorGroup } from '@domain/context/actor-group/actor-group.entity';
import { Profiling } from '@src/common/decorators';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { CreateRelationInput } from '@domain/collaboration/relation';
import { Relation } from '@domain/collaboration/relation/relation.entity';
import { CreateProjectInput } from '@domain/collaboration/project';
import { Project } from '@domain/collaboration/project/project.entity';
import { IProject } from '@domain/collaboration/project/project.interface';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { UpdateOpportunityInput } from './opportunity.dto.update';

@Resolver()
export class OpportunityResolverMutations {
  constructor(private opportunityService: OpportunityService) {}
  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Opportunity, {
    description:
      'Updates the specified Opportunity with the provided data (merge)',
  })
  @Profiling.api
  async updateOpportunity(
    @Args('opportunityData') opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    const Opportunity = await this.opportunityService.updateOpportunity(
      opportunityData
    );
    return Opportunity;
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the Opportunity with the specified ID',
  })
  async removeOpportunity(@Args('ID') opportunityID: number): Promise<boolean> {
    return await this.opportunityService.removeOpportunity(opportunityID);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
    description: 'Create a new Project on the Opportunity',
  })
  @Profiling.api
  async createProject(
    @Args('projectData') projectData: CreateProjectInput
  ): Promise<IProject> {
    const project = await this.opportunityService.createProject(projectData);
    return project;
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new aspect on the Opportunity',
  })
  @Profiling.api
  async createAspect(
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    return await this.opportunityService.createAspect(aspectData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => ActorGroup, {
    description: 'Create a new actor group on the Opportunity',
  })
  @Profiling.api
  async createActorGroup(
    @Args('actorGroupData') actorGroupData: CreateActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup = await this.opportunityService.createActorGroup(
      actorGroupData
    );
    return actorGroup;
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Relation, {
    description: 'Create a new relation on the Opportunity',
  })
  @Profiling.api
  async createRelation(
    @Args('relationData') relationData: CreateRelationInput
  ): Promise<IRelation> {
    return await this.opportunityService.createRelation(relationData);
  }
}

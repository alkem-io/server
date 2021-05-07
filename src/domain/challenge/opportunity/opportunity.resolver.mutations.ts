import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { OpportunityService } from './opportunity.service';
import { CreateAspectInput, IAspect, Aspect } from '@domain/context/aspect';
import {} from '@domain/context/actor-group';
import {
  CreateActorGroupInput,
  IActorGroup,
  ActorGroup,
} from '@domain/context/actor-group';
import { Profiling } from '@src/common/decorators';
import {
  CreateRelationInput,
  IRelation,
  Relation,
} from '@domain/collaboration/relation';
import {
  CreateProjectInput,
  Project,
  IProject,
} from '@domain/collaboration/project';
import {} from './opportunity.dto.update';
import {
  DeleteOpportunityInput,
  UpdateOpportunityInput,
  Opportunity,
  IOpportunity,
  OpportunityEventInput,
} from '@domain/challenge/opportunity';
import { OpportunityLifecycleOptionsProvider } from './opportunity.lifecycle.options.provider';
import { AuthorizationGlobalRoles } from '@common/decorators';
import {
  AuthorizationRolesGlobal,
  AuthorizationRulesGuard,
} from '@core/authorization';
@Resolver()
export class OpportunityResolverMutations {
  constructor(
    private opportunityService: OpportunityService,
    private opportunityLifecycleOptionsProvider: OpportunityLifecycleOptionsProvider
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Opportunity, {
    description: 'Updates the Opportunity.',
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

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Opportunity, {
    description: 'Deletes the Opportunity.',
  })
  async deleteOpportunity(
    @Args('deleteData') deleteData: DeleteOpportunityInput
  ): Promise<IOpportunity> {
    return await this.opportunityService.deleteOpportunity(deleteData);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
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

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new Aspect on the Opportunity.',
  })
  @Profiling.api
  async createAspect(
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    return await this.opportunityService.createAspect(aspectData);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => ActorGroup, {
    description: 'Create a new Actor Group on the Opportunity.',
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

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Relation, {
    description: 'Create a new Relation on the Opportunity.',
  })
  @Profiling.api
  async createRelation(
    @Args('relationData') relationData: CreateRelationInput
  ): Promise<IRelation> {
    return await this.opportunityService.createRelation(relationData);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Opportunity, {
    description: 'Trigger an event on an Opportunity.',
  })
  async eventOnOpportunity(
    @Args('opportunityEventData')
    opportunityEventData: OpportunityEventInput
  ): Promise<IOpportunity> {
    return await this.opportunityLifecycleOptionsProvider.eventOnOpportunity(
      opportunityEventData
    );
  }
}

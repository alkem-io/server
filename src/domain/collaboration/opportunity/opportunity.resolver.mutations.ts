import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import {} from '@domain/context/actor-group';
import { Profiling } from '@src/common/decorators';
import { CreateRelationInput, IRelation } from '@domain/collaboration/relation';
import { CreateProjectInput, IProject } from '@domain/collaboration/project';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { OpportunityService } from './opportunity.service';
import {
  DeleteOpportunityInput,
  IOpportunity,
  OpportunityEventInput,
  UpdateOpportunityInput,
} from '@domain/collaboration/opportunity';
import { AuthorizationRoleGlobal } from '@common/enums';
import { OpportunityLifecycleOptionsProvider } from './opportunity.lifecycle.options.provider';

@Resolver()
export class OpportunityResolverMutations {
  constructor(
    private opportunityService: OpportunityService,
    private opportunityLifecycleOptionsProvider: OpportunityLifecycleOptionsProvider
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Updates the specified Opportunity.',
  })
  @Profiling.api
  async updateOpportunity(
    @Args('opportunityData') opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    const challenge = await this.opportunityService.updateOpportunity(
      opportunityData
    );
    return challenge;
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Deletes the specified Opportunity.',
  })
  async deleteOpportunity(
    @Args('deleteData') deleteData: DeleteOpportunityInput
  ): Promise<IOpportunity> {
    return await this.opportunityService.deleteOpportunity(
      parseInt(deleteData.ID)
    );
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Create a new Project on the Opportunity',
  })
  @Profiling.api
  async createProject(
    @Args('projectData') projectData: CreateProjectInput
  ): Promise<IProject> {
    const project = await this.opportunityService.createProject(projectData);
    return project;
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IRelation, {
    description: 'Create a new Relation on the Opportunity.',
  })
  @Profiling.api
  async createRelation(
    @Args('relationData') relationData: CreateRelationInput
  ): Promise<IRelation> {
    return await this.opportunityService.createRelation(relationData);
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Trigger an event on the Opportunity.',
  })
  async eventOnOpportunity(
    @Args('opportunityEventData')
    challengeEventData: OpportunityEventInput
  ): Promise<IOpportunity> {
    return await this.opportunityLifecycleOptionsProvider.eventOnOpportunity({
      eventName: challengeEventData.eventName,
      ID: challengeEventData.ID,
    });
  }
}

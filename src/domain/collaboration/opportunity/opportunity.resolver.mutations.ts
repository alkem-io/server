import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import {} from '@domain/context/actor-group';
import { CurrentUser, Profiling } from '@src/common/decorators';
import {
  CreateRelationInput,
  IRelation,
  RelationService,
} from '@domain/collaboration/relation';
import { CreateProjectInput, IProject } from '@domain/collaboration/project';
import { GraphqlGuard } from '@core/authorization';
import { OpportunityService } from './opportunity.service';
import {
  DeleteOpportunityInput,
  IOpportunity,
  OpportunityEventInput,
  UpdateOpportunityInput,
} from '@domain/collaboration/opportunity';
import { AuthorizationPrivilege } from '@common/enums';
import { OpportunityLifecycleOptionsProvider } from './opportunity.lifecycle.options.provider';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { UserInfo } from '@core/authentication';
import { ProjectService } from '../project/project.service';

@Resolver()
export class OpportunityResolverMutations {
  constructor(
    private relationService: RelationService,
    private projectService: ProjectService,
    private authorizationEngine: AuthorizationEngineService,
    private opportunityService: OpportunityService,
    private opportunityLifecycleOptionsProvider: OpportunityLifecycleOptionsProvider
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Updates the specified Opportunity.',
  })
  @Profiling.api
  async updateOpportunity(
    @CurrentUser() userInfo: UserInfo,
    @Args('opportunityData') opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      opportunity.authorization,
      AuthorizationPrivilege.UPDATE,
      `update opportunity: ${opportunity.nameID}`
    );
    return await this.opportunityService.updateOpportunity(opportunityData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Deletes the specified Opportunity.',
  })
  async deleteOpportunity(
    @CurrentUser() userInfo: UserInfo,
    @Args('deleteData') deleteData: DeleteOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      opportunity.authorization,
      AuthorizationPrivilege.DELETE,
      `delete opportunity: ${opportunity.nameID}`
    );
    return await this.opportunityService.deleteOpportunity(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Create a new Project on the Opportunity',
  })
  @Profiling.api
  async createProject(
    @CurrentUser() userInfo: UserInfo,
    @Args('projectData') projectData: CreateProjectInput
  ): Promise<IProject> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      projectData.opportunityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      opportunity.authorization,
      AuthorizationPrivilege.UPDATE,
      `create project (${projectData.nameID}) on Opportunity: ${opportunity.nameID}`
    );
    const project = await this.opportunityService.createProject(projectData);
    project.authorization = await this.authorizationEngine.inheritParentAuthorization(
      project.authorization,
      opportunity.authorization
    );
    return await this.projectService.saveProject(project);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRelation, {
    description: 'Create a new Relation on the Opportunity.',
  })
  @Profiling.api
  async createRelation(
    @CurrentUser() userInfo: UserInfo,
    @Args('relationData') relationData: CreateRelationInput
  ): Promise<IRelation> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      relationData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      opportunity.authorization,
      AuthorizationPrivilege.UPDATE,
      `create relation: ${opportunity.nameID}`
    );
    const relation = await this.opportunityService.createRelation(relationData);
    relation.authorization = this.authorizationEngine.inheritParentAuthorization(
      relation.authorization,
      opportunity.authorization
    );
    return await this.relationService.saveRelation(relation);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Trigger an event on the Opportunity.',
  })
  async eventOnOpportunity(
    @CurrentUser() userInfo: UserInfo,
    @Args('opportunityEventData')
    opportunityEventData: OpportunityEventInput
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityEventData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      opportunity.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on opportunity: ${opportunity.nameID}`
    );
    return await this.opportunityLifecycleOptionsProvider.eventOnOpportunity({
      eventName: opportunityEventData.eventName,
      ID: opportunityEventData.ID,
    });
  }
}

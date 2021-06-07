import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { CreateAspectInput, IAspect } from '@domain/context/aspect';
import { ProjectService } from './project.service';
import {
  UpdateProjectInput,
  IProject,
  DeleteProjectInput,
  ProjectEventInput,
} from '@domain/collaboration/project';
import { ProjectLifecycleOptionsProvider } from './project.lifecycle.options.provider';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';
import { AspectService } from '@domain/context/aspect/aspect.service';
@Resolver()
export class ProjectResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private aspectService: AspectService,
    private projectService: ProjectService,
    private projectLifecycleOptionsProvider: ProjectLifecycleOptionsProvider
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Deletes the specified Project.',
  })
  async deleteProject(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteProjectInput
  ): Promise<IProject> {
    const project = await this.projectService.getProjectOrFail(deleteData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      project.authorization,
      AuthorizationPrivilege.DELETE,
      `delete project: ${project.nameID}`
    );
    return await this.projectService.deleteProject(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Updates the specified Project.',
  })
  async updateProject(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('projectData') projectData: UpdateProjectInput
  ): Promise<IProject> {
    const project = await this.projectService.getProjectOrFail(projectData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      project.authorization,
      AuthorizationPrivilege.UPDATE,
      `update project: ${project.nameID}`
    );
    return await this.projectService.updateProject(projectData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Create a new Aspect on the Project.',
  })
  @Profiling.api
  async createAspectOnProject(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    const project = await this.projectService.getProjectOrFail(
      aspectData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      project.authorization,
      AuthorizationPrivilege.CREATE,
      `create aspect: ${project.nameID}`
    );

    const aspect = await this.projectService.createAspect(aspectData);
    aspect.authorization = await this.authorizationEngine.inheritParentAuthorization(
      aspect.authorization,
      project.authorization
    );
    return await this.aspectService.saveAspect(aspect);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Trigger an event on the Project.',
  })
  async eventOnProject(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('projectEventData')
    projectEventData: ProjectEventInput
  ): Promise<IProject> {
    const project = await this.projectService.getProjectOrFail(
      projectEventData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      project.authorization,
      AuthorizationPrivilege.CREATE,
      `event on project: ${project.nameID}`
    );
    return await this.projectLifecycleOptionsProvider.eventOnProject(
      projectEventData,
      agentInfo
    );
  }
}

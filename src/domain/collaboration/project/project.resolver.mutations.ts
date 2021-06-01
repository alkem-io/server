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
import { UserInfo } from '@core/authentication';
@Resolver()
export class ProjectResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private projectService: ProjectService,
    private projectLifecycleOptionsProvider: ProjectLifecycleOptionsProvider
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Deletes the specified Project.',
  })
  async deleteProject(
    @CurrentUser() userInfo: UserInfo,
    @Args('deleteData') deleteData: DeleteProjectInput
  ): Promise<IProject> {
    const project = await this.projectService.getProjectOrFail(deleteData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
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
    @CurrentUser() userInfo: UserInfo,
    @Args('projectData') projectData: UpdateProjectInput
  ): Promise<IProject> {
    const project = await this.projectService.getProjectOrFail(projectData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
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
    @CurrentUser() userInfo: UserInfo,
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    const project = await this.projectService.getProjectOrFail(
      aspectData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      project.authorization,
      AuthorizationPrivilege.CREATE,
      `create aspect: ${project.nameID}`
    );
    return await this.projectService.createAspect(aspectData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Trigger an event on the Project.',
  })
  async eventOnProject(
    @CurrentUser() userInfo: UserInfo,
    @Args('projectEventData')
    projectEventData: ProjectEventInput
  ): Promise<IProject> {
    const project = await this.projectService.getProjectOrFail(
      projectEventData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      project.authorization,
      AuthorizationPrivilege.CREATE,
      `event on project: ${project.nameID}`
    );
    return await this.projectLifecycleOptionsProvider.eventOnProject(
      projectEventData
    );
  }
}

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { CreateAspectInput, IAspect } from '@domain/context/aspect';
import { ProjectService } from './project.service';
import {
  UpdateProjectInput,
  IProject,
  DeleteProjectInput,
  ProjectEventInput,
} from '@domain/collaboration/project';
import { ProjectLifecycleOptionsProvider } from './project.lifecycle.options.provider';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';
@Resolver()
export class ProjectResolverMutations {
  constructor(
    private projectService: ProjectService,
    private projectLifecycleOptionsProvider: ProjectLifecycleOptionsProvider
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Deletes the specified Project.',
  })
  async deleteProject(
    @Args('deleteData') deleteData: DeleteProjectInput
  ): Promise<IProject> {
    return await this.projectService.deleteProject(deleteData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Updates the specified Project.',
  })
  async updateProject(
    @Args('projectData') projectData: UpdateProjectInput
  ): Promise<IProject> {
    return await this.projectService.updateProject(projectData);
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Create a new Aspect on the Project.',
  })
  @Profiling.api
  async createAspectOnProject(
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    const aspect = await this.projectService.createAspect(aspectData);
    return aspect;
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IProject, {
    description: 'Trigger an event on the Project.',
  })
  async eventOnProject(
    @Args('projectEventData')
    projectEventData: ProjectEventInput
  ): Promise<IProject> {
    return await this.projectLifecycleOptionsProvider.eventOnProject(
      projectEventData
    );
  }
}

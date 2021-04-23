import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Profiling } from '@src/common/decorators';
import { CreateAspectInput, IAspect, Aspect } from '@domain/context/aspect';
import { ProjectService } from './project.service';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import {
  UpdateProjectInput,
  Project,
  IProject,
  DeleteProjectInput,
  ProjectEventInput,
} from '@domain/collaboration/project';
import { ProjectLifecycleOptionsProvider } from './project.lifecycle.options.provider';

@Resolver()
export class ProjectResolverMutations {
  constructor(
    private projectService: ProjectService,
    private projectLifecycleOptionsProvider: ProjectLifecycleOptionsProvider
  ) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
    description: 'Deletes the specified Project.',
  })
  async deleteProject(
    @Args('deleteData') deleteData: DeleteProjectInput
  ): Promise<IProject> {
    return await this.projectService.deleteProject(deleteData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
    description: 'Updates the specified Project.',
  })
  async updateProject(
    @Args('projectData') projectData: UpdateProjectInput
  ): Promise<IProject> {
    return await this.projectService.updateProject(projectData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new Aspect on the Project.',
  })
  @Profiling.api
  async createAspectOnProject(
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    const aspect = await this.projectService.createAspect(aspectData);
    return aspect;
  }

  @Roles(AuthorizationRoles.EcoverseAdmins, AuthorizationRoles.GlobalAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
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

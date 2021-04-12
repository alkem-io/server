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
} from '@domain/collaboration/project';
import { RemoveEntityInput } from '@domain/common/entity.dto.remove';
@Resolver()
export class ProjectResolverMutations {
  constructor(private projectService: ProjectService) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
    description: 'Removes the Project with the specified ID',
  })
  async removeProject(
    @Args('removeData') removeData: RemoveEntityInput
  ): Promise<IProject> {
    return await this.projectService.removeProject(removeData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
    description: 'Updates the Project with the specified ID',
  })
  async updateProject(
    @Args('projectData') projectData: UpdateProjectInput
  ): Promise<IProject> {
    return await this.projectService.updateProject(projectData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new aspect on the Project',
  })
  @Profiling.api
  async createAspectOnProject(
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    const aspect = await this.projectService.createAspect(aspectData);
    return aspect;
  }
}

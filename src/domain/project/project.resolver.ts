import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authorization/graphql.guard';
import { Roles } from '@utils/authorization/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { AspectInput } from '@domain/aspect/aspect.dto';
import { Aspect } from '@domain/aspect/aspect.entity';
import { IAspect } from '@domain/aspect/aspect.interface';
import { ProjectInput } from './project.dto';
import { Project } from './project.entity';
import { IProject } from './project.interface';
import { ProjectService } from './project.service';
import { AuthorizationRoles } from '@utils/authorization/authorization.roles';
@Resolver()
export class ProjectResolver {
  constructor(private projectService: ProjectService) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [Project], {
    nullable: false,
    description: 'All projects within this ecoverse',
  })
  @Profiling.api
  async projects(): Promise<IProject[]> {
    return await this.projectService.getProjects();
  }

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => Project, {
    nullable: false,
    description: 'A particular Project, identified by the ID',
  })
  @Profiling.api
  async project(@Args('ID') id: number): Promise<IProject> {
    return await this.projectService.getProjectByID(id);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the Project with the specified ID',
  })
  async removeProject(@Args('ID') ProjectID: number): Promise<boolean> {
    return await this.projectService.removeProject(ProjectID);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
    description: 'Updates the Project with the specified ID',
  })
  async updateProject(
    @Args('ID') projectID: number,
    @Args('projectData') projectData: ProjectInput
  ): Promise<IProject> {
    return await this.projectService.updateProject(projectID, projectData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new aspect on the Project identified by the ID',
  })
  @Profiling.api
  async createAspectOnProject(
    @Args('projectID') projectId: number,
    @Args('aspectData') aspectData: AspectInput
  ): Promise<IAspect> {
    const aspect = await this.projectService.createAspect(
      projectId,
      aspectData
    );
    return aspect;
  }
}

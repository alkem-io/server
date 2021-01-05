import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authentication/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { AspectInput } from '@domain/aspect/aspect.dto';
import { Aspect } from '@domain/aspect/aspect.entity';
import { IAspect } from '@domain/aspect/aspect.interface';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { ProjectInput } from './project.dto';
import { Project } from './project.entity';
import { IProject } from './project.interface';
import { ProjectService } from './project.service';
@Resolver()
export class ProjectResolver {
  constructor(private projectService: ProjectService) {}

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [Project], {
    nullable: false,
    description: 'All projects within this ecoverse',
  })
  @Profiling.api
  async projects(): Promise<IProject[]> {
    return await this.projectService.getProjects();
  }

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => Project, {
    nullable: false,
    description: 'A particular Project, identified by the ID',
  })
  @Profiling.api
  async project(@Args('ID') id: number): Promise<IProject> {
    return await this.projectService.getProjectByID(id);
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the Project with the specified ID',
  })
  async removeProject(@Args('ID') ProjectID: number): Promise<boolean> {
    return await this.projectService.removeProject(ProjectID);
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
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

  @Roles(RestrictedGroupNames.EcoverseAdmins)
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

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { ProjectService } from './project.service';
import { IProject } from '@domain/collaboration/project';
import { ProjectLifecycleOptionsProvider } from './project.lifecycle.options.provider';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { DeleteProjectInput } from './dto/project.dto.delete';
import { UpdateProjectInput } from './dto/project.dto.update';
import { ProjectEventInput } from './dto/project.dto.event';
@Resolver()
export class ProjectResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
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
    await this.authorizationService.grantAccessOrFail(
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      project.authorization,
      AuthorizationPrivilege.UPDATE,
      `update project: ${project.nameID}`
    );
    return await this.projectService.updateProject(projectData);
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
    await this.authorizationService.grantAccessOrFail(
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

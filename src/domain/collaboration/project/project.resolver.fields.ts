import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { ProjectService } from './project.service';
import { ILifecycle } from '@domain/common/lifecycle';
import { IProject, Project } from '@domain/collaboration/project';

@Resolver(() => IProject)
export class ProjectResolverFields {
  constructor(private projectService: ProjectService) {}

  @ResolveField('lifecycle2', () => ILifecycle, {
    nullable: true,
    description:
      'The maturity phase of the project i.e. new, being refined, committed, in-progress, closed etc',
  })
  @Profiling.api
  async lifecycle(@Parent() project: Project) {
    return await this.projectService.getLifecycle(project.id);
  }
}

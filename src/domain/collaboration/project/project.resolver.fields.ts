import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { Project } from './project.entity';
import { ProjectService } from './project.service';
import { Lifecycle } from '@domain/common/lifecycle';

@Resolver(() => Project)
export class ProjectResolverFields {
  constructor(private projectService: ProjectService) {}

  @ResolveField('lifecycle', () => Lifecycle, {
    nullable: true,
    description:
      'The maturity phase of the project i.e. new, being refined, committed, in-progress, closed etc',
  })
  @Profiling.api
  async lifecycle(@Parent() Project: Project) {
    return await this.projectService.getLifecycle(Project.id);
  }
}

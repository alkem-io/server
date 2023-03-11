import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { ProjectService } from './project.service';
import { ILifecycle } from '@domain/common/lifecycle';
import { IProject, Project } from '@domain/collaboration/project';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { IProfile } from '@domain/common/profile/profile.interface';

@Resolver(() => IProject)
export class ProjectResolverFields {
  constructor(private projectService: ProjectService) {}

  @ResolveField('lifecycle', () => ILifecycle, {
    nullable: true,
    description:
      'The maturity phase of the project i.e. new, being refined, committed, in-progress, closed etc',
  })
  @Profiling.api
  async lifecycle(@Parent() project: Project) {
    return await this.projectService.getLifecycle(project.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Project.',
  })
  @Profiling.api
  async profile(@Parent() project: IProject): Promise<IProfile> {
    return await this.projectService.getProfile(project);
  }
}

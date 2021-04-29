import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AspectModule } from '@domain/context/aspect/aspect.module';
import { Project } from './project.entity';
import { ProjectResolverMutations } from './project.resolver.mutations';
import { ProjectService } from './project.service';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { ProjectLifecycleOptionsProvider } from './project.lifecycle.options.provider';
import { ProjectResolverFields } from './project.resolver.fields';

@Module({
  imports: [AspectModule, LifecycleModule, TypeOrmModule.forFeature([Project])],
  providers: [
    ProjectService,
    ProjectResolverMutations,
    ProjectResolverFields,
    ProjectLifecycleOptionsProvider,
  ],
  exports: [ProjectService],
})
export class ProjectModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AspectModule } from '@domain/context/aspect/aspect.module';
import { Project } from './project.entity';
import { ProjectResolverMutations } from './project.resolver.mutations';
import { ProjectService } from './project.service';

@Module({
  imports: [AspectModule, TypeOrmModule.forFeature([Project])],
  providers: [ProjectService, ProjectResolverMutations],
  exports: [ProjectService],
})
export class ProjectModule {}

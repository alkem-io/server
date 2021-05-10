import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collaboration } from '@domain/collaboration/collaboration';
import { CollaborationService } from './collaboration.service';
import { ProjectModule } from '../project/project.module';
import { RelationModule } from '../relation/relation.module';
import { CollaborationResolverFields } from './collaboration.resolver.fields';
import { CollaborationResolverMutations } from './collaboration.resolver.mutations';

@Module({
  imports: [
    ProjectModule,
    RelationModule,
    TypeOrmModule.forFeature([Collaboration]),
  ],
  providers: [
    CollaborationService,
    CollaborationResolverFields,
    CollaborationResolverMutations,
  ],
  exports: [CollaborationService],
})
export class CollaborationModule {}

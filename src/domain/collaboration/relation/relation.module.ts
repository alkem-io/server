import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Relation } from './relation.entity';
import { RelationResolverMutations } from './relation.resolver.mutations';
import { RelationService } from './relation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Relation])],
  providers: [RelationResolverMutations, RelationService],
  exports: [RelationService],
})
export class RelationModule {}

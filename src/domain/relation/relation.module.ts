import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Relation } from './relation.entity';
import { RelationResolver } from './relation.resolver';
import { RelationService } from './relation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Relation])],
  providers: [RelationResolver, RelationService],
  exports: [RelationService],
})
export class RelationModule {}

import { AuthorizationDefinitionModule } from '@domain/common/authorization-definition/authorization.definition.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { Relation } from './relation.entity';
import { RelationResolverMutations } from './relation.resolver.mutations';
import { RelationService } from './relation.service';

@Module({
  imports: [
    AuthorizationDefinitionModule,
    AuthorizationEngineModule,
    TypeOrmModule.forFeature([Relation]),
  ],
  providers: [RelationResolverMutations, RelationService],
  exports: [RelationService],
})
export class RelationModule {}

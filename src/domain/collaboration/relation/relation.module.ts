import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { Relation } from './relation.entity';
import { RelationResolverMutations } from './relation.resolver.mutations';
import { RelationService } from './relation.service';
import { RelationAuthorizationService } from './relation.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationEngineModule,
    TypeOrmModule.forFeature([Relation]),
  ],
  providers: [
    RelationResolverMutations,
    RelationService,
    RelationAuthorizationService,
  ],
  exports: [RelationService, RelationAuthorizationService],
})
export class RelationModule {}

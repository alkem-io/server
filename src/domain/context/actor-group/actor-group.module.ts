import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActorModule } from '@domain/context/actor/actor.module';
import { ActorGroup } from './actor-group.entity';
import { ActorGroupResolverMutations } from './actor-group.resolver.mutations';
import { ActorGroupService } from './actor-group.service';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { ActorGroupAuthorizationService } from './actor-group.service.authorization';
import { AuthorizationDefinitionModule } from '@domain/common/authorization-definition/authorization.definition.module';

@Module({
  imports: [
    AuthorizationDefinitionModule,
    AuthorizationEngineModule,
    ActorModule,
    TypeOrmModule.forFeature([ActorGroup]),
  ],
  providers: [
    ActorGroupService,
    ActorGroupAuthorizationService,
    ActorGroupResolverMutations,
  ],
  exports: [ActorGroupService, ActorGroupAuthorizationService],
})
export class ActorGroupModule {}

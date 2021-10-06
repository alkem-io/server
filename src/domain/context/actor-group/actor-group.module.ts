import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActorModule } from '@domain/context/actor/actor.module';
import { ActorGroup } from './actor-group.entity';
import { ActorGroupResolverMutations } from './actor-group.resolver.mutations';
import { ActorGroupService } from './actor-group.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActorGroupAuthorizationService } from './actor-group.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
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

import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { Actor } from './actor.entity';
import { ActorResolverMutations } from './actor.resolver.mutations';
import { ActorService } from './actor.service';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationEngineModule,
    TypeOrmModule.forFeature([Actor]),
  ],
  providers: [ActorService, ActorResolverMutations],
  exports: [ActorService],
})
export class ActorModule {}

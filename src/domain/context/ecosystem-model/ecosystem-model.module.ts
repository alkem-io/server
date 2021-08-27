import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcosystemModelService } from './ecosystem-model.service';
import { ActorGroupModule } from '@domain/context/actor-group/actor-group.module';
import { EcosystemModel } from './ecosystem-model.entity';
import { EcosystemModelResolverMutations } from './ecosystem-model.resolver.mutations';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { EcosystemModelAuthorizationService } from './ecosystem-model.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CanvasModule } from '@domain/common/canvas/canvas.module';

@Module({
  imports: [
    AuthorizationEngineModule,
    AuthorizationPolicyModule,
    ActorGroupModule,
    CanvasModule,
    TypeOrmModule.forFeature([EcosystemModel]),
  ],
  providers: [
    EcosystemModelResolverMutations,
    EcosystemModelService,
    EcosystemModelAuthorizationService,
  ],
  exports: [EcosystemModelService, EcosystemModelAuthorizationService],
})
export class EcosystemModelModule {}

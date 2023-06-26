import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcosystemModelService } from './ecosystem-model.service';
import { ActorGroupModule } from '@domain/context/actor-group/actor-group.module';
import { EcosystemModel } from './ecosystem-model.entity';
import { EcosystemModelResolverMutations } from './ecosystem-model.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { EcosystemModelAuthorizationService } from './ecosystem-model.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { EcosystemModelResolverFields } from './ecosystem-model.resolver.fields';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ActorGroupModule,
    WhiteboardModule,
    TypeOrmModule.forFeature([EcosystemModel]),
  ],
  providers: [
    EcosystemModelResolverMutations,
    EcosystemModelResolverFields,
    EcosystemModelService,
    EcosystemModelAuthorizationService,
  ],
  exports: [EcosystemModelService, EcosystemModelAuthorizationService],
})
export class EcosystemModelModule {}

import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiServer } from './ai.server.entity';
import { AiServerResolverFields } from './ai.server.resolver.fields';
import { AiServerResolverMutations } from './ai.server.resolver.mutations';
import { AiServerResolverQueries } from './ai.server.resolver.queries';
import { AiServerService } from './ai.server.service';
import { AiServerAuthorizationService } from './ai.server.service.authorization';
import { AiPersonaServiceModule } from '../ai-persona-service/ai.persona.service.module';
import { AiPersonaEngineAdapterModule } from '../ai-persona-engine-adapter/ai.persona.engine.adapter.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { VcInteractionModule } from '@domain/communication/vc-interaction/vc.interaction.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AiPersonaServiceModule,
    TypeOrmModule.forFeature([AiServer]),
    AiPersonaEngineAdapterModule,
    PlatformAuthorizationPolicyModule,
    VcInteractionModule,
    CommunicationAdapterModule,
  ],
  providers: [
    AiServerResolverQueries,
    AiServerResolverMutations,
    AiServerResolverFields,
    AiServerService,
    AiServerAuthorizationService,
  ],
  exports: [AiServerService, AiServerAuthorizationService],
})
export class AiServerModule {}

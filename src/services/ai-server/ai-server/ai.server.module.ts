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
import { AiPersonaModule } from '../ai-persona/ai.persona.module';
import { AiPersonaEngineAdapterModule } from '../ai-persona-engine-adapter/ai.persona.engine.adapter.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { RoomIntegrationModule } from '@services/room-integration/room.integration.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AiPersonaModule,
    TypeOrmModule.forFeature([AiServer, VirtualContributor]),
    AiPersonaEngineAdapterModule,
    PlatformAuthorizationPolicyModule,
    CommunicationAdapterModule,
    SubscriptionServiceModule,
    RoomIntegrationModule,
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

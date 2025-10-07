import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiPersona } from './ai.persona.entity';
import { AiPersonaService } from './ai.persona.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AiPersonaEngineAdapterModule } from '../ai-persona-engine-adapter/ai.persona.engine.adapter.module';
import { AiPersonaAuthorizationService } from './ai.persona.service.authorization';
import { AiPersonaResolverMutations } from './ai.persona.resolver.mutations';
import { AiPersonaResolverFields } from './ai.persona.resolver.fields';
import { AiPersonaExternalConfigResolverFields } from './ai.persona.external.config.resolver.fields';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TypeOrmModule.forFeature([AiPersona]),
    AiPersonaEngineAdapterModule,
  ],
  providers: [
    AiPersonaService,
    AiPersonaAuthorizationService,
    AiPersonaResolverMutations,
    AiPersonaResolverFields,
    AiPersonaExternalConfigResolverFields,
  ],
  exports: [AiPersonaService, AiPersonaAuthorizationService],
})
export class AiPersonaModule {}

import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiPersonaEngineAdapterModule } from '../ai-persona-engine-adapter/ai.persona.engine.adapter.module';
import { AiPersona } from './ai.persona.entity';
import { AiPersonaExternalConfigResolverFields } from './ai.persona.external.config.resolver.fields';
import { AiPersonaResolverFields } from './ai.persona.resolver.fields';
import { AiPersonaResolverMutations } from './ai.persona.resolver.mutations';
import { AiPersonaService } from './ai.persona.service';
import { AiPersonaAuthorizationService } from './ai.persona.service.authorization';

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

import { Module } from '@nestjs/common';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { AiPersonaServiceResolverMutations } from './ai.persona.service.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiPersonaServiceAuthorizationService } from './ai.persona.service.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AiPersonaService } from './ai.persona.service.entity';
import { AiPersonaServiceResolverFields } from './ai.persona.service.resolver.fields';
import { AiPersonaEngineAdapterModule } from '../ai-persona-engine-adapter/ai.persona.engine.adapter.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TypeOrmModule.forFeature([AiPersonaService]),
    AiPersonaServiceModule,
    AiPersonaEngineAdapterModule,
  ],
  providers: [
    AiPersonaServiceService,
    AiPersonaServiceAuthorizationService,
    AiPersonaServiceResolverMutations,
    AiPersonaServiceResolverFields,
  ],
  exports: [AiPersonaServiceService, AiPersonaServiceAuthorizationService],
})
export class AiPersonaServiceModule {}

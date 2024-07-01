import { Module } from '@nestjs/common';
import { AiPersonaService } from './ai.persona.service';
import { AiPersonaResolverMutations } from './ai.persona.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiPersonaAuthorizationService } from './ai.persona.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AiPersona } from './ai.persona.entity';
import { AiPersonaResolverFields } from './ai.persona.resolver.fields';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    AiServerAdapterModule,
    TypeOrmModule.forFeature([AiPersona]),
  ],
  providers: [
    AiPersonaService,
    AiPersonaAuthorizationService,
    AiPersonaResolverMutations,
    AiPersonaResolverFields,
  ],
  exports: [AiPersonaService, AiPersonaAuthorizationService],
})
export class AiPersonaModule {}

import { Module } from '@nestjs/common';
import { AiPersonaService } from './ai.persona.service';
import { AiPersonaResolverMutations } from './ai.persona.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiPersonaResolverQueries } from './ai.persona.resolver.queries';
import { AiPersonaAuthorizationService } from './ai.persona.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AiPersona } from './ai.persona.entity';
import { AiPersonaResolverFields } from './ai.persona.resolver.fields';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TypeOrmModule.forFeature([AiPersona]),
  ],
  providers: [
    AiPersonaService,
    AiPersonaAuthorizationService,
    AiPersonaResolverQueries,
    AiPersonaResolverMutations,
    AiPersonaResolverFields,
  ],
  exports: [AiPersonaService, AiPersonaAuthorizationService],
})
export class AiPersonaModule {}

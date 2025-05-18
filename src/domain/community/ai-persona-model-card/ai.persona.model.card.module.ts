import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AiPersonaModelCardResolverFields } from './ai.persona.model.card.resolver.fields';

@Module({
  imports: [AuthorizationPolicyModule, AuthorizationModule],
  providers: [AiPersonaModelCardResolverFields],
  exports: [],
})
export class AiPersonaModelCardModule {}

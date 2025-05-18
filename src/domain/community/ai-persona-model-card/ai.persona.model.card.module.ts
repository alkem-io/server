import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AiPersonaModelCardService } from './ai.persona.model.card.service';
import { AiPersonaModelCardResolverFields } from './ai.persona.model.card.resolver.fields';

@Module({
  imports: [AuthorizationPolicyModule, AuthorizationModule],
  providers: [AiPersonaModelCardResolverFields, AiPersonaModelCardService],
  exports: [AiPersonaModelCardService],
})
export class AiPersonaModelCardModule {}

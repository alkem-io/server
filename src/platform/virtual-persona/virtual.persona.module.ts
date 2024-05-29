import { Module } from '@nestjs/common';
import { VirtualPersonaService } from './virtual.persona.service';
import { VirtualPersonaResolverMutations } from './virtual.persona.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualPersonaResolverQueries } from './virtual.persona.resolver.queries';
import { VirtualPersonaAuthorizationService } from './virtual.persona.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VirtualPersona } from './virtual.persona.entity';
import { VirtualPersonaResolverFields } from './virtual.persona.resolver.fields';
import { VirtualPersonaEngineAdapterModule } from '@services/adapters/virtual-persona-engine-adapter/virtual.persona.engine.adapter.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    VirtualPersonaEngineAdapterModule,
    TypeOrmModule.forFeature([VirtualPersona]),
  ],
  providers: [
    VirtualPersonaService,
    VirtualPersonaAuthorizationService,
    VirtualPersonaResolverQueries,
    VirtualPersonaResolverMutations,
    VirtualPersonaResolverFields,
  ],
  exports: [VirtualPersonaService, VirtualPersonaAuthorizationService],
})
export class VirtualPersonaModule {}

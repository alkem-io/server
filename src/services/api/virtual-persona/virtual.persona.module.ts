import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { VirtualPersonaService } from './virtual.persona.service';
import { VirtualPersonaResolverQueries } from './virtual.persona.resolver.queries';
import { VirtualPersonaResolverMutations } from './virtual.persona.resolver.mutations';
import { VirtualPersonaAdapterModule } from '@services/adapters/virtual-persona-adapter/virtual.persona.adapter.module';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    VirtualPersonaAdapterModule,
  ],
  providers: [
    VirtualPersonaService,
    VirtualPersonaResolverMutations,
    VirtualPersonaResolverQueries,
  ],
  exports: [VirtualPersonaService, VirtualPersonaResolverMutations],
})
export class VirtualPersonaModule {}

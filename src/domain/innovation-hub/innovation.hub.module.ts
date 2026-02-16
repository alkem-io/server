import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { InnovationHubResolverFields } from './innovation.hub.resolver.fields';
import { InnovationHubResolverMutations } from './innovation.hub.resolver.mutations';
import { InnovationHubService } from './innovation.hub.service';

@Module({
  imports: [
    AccountLookupModule,
    SpaceLookupModule,
    ProfileModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    NamingModule,
  ],
  providers: [
    InnovationHubService,
    InnovationHubResolverFields,
    InnovationHubResolverMutations,
    InnovationHubAuthorizationService,
  ],
  exports: [InnovationHubService, InnovationHubAuthorizationService],
})
export class InnovationHubModule {}

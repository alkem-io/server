import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationHubService } from './innovation.hub.service';
import { InnovationHub } from './innovation.hub.entity';
import { SpaceModule } from '@domain/space/space/space.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InnovationHubResolverMutations } from './innovation.hub.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { InnovationHubResolverFields } from './innovation.hub.resolver.fields';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';

@Module({
  imports: [
    AccountLookupModule,
    SpaceModule,
    ProfileModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    NamingModule,
    StorageAggregatorResolverModule,
    TypeOrmModule.forFeature([InnovationHub]),
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

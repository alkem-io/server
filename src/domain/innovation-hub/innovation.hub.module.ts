import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationHubService } from './innovation.hub.service';
import { InnovationHub } from './innovation.hub.entity';
import { InnovationHubFieldResolver } from './innovation.hub.field.resolver';
import { HubModule } from '@domain/challenge/hub/hub.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InnovationHubResolverMutations } from './innovation.hub.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InnovationHub]),
    HubModule,
    ProfileModule,
    PlatformAuthorizationPolicyModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
  ],
  providers: [
    InnovationHubService,
    InnovationHubFieldResolver,
    InnovationHubResolverMutations,
    InnovationHubAuthorizationService,
  ],
  exports: [InnovationHubService, InnovationHubAuthorizationService],
})
export class InnovationHubModule {}

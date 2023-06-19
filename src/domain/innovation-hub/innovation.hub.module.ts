import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationHxbService } from './innovation.hub.service';
import { InnovationHxb } from './innovation.hub.entity';
import { InnovationHxbFieldResolver } from './innovation.hub.field.resolver';
import { HubModule } from '@domain/challenge/hub/hub.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { InnovationHxbAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InnovationHxbResolverMutations } from './innovation.hub.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InnovationHxb]),
    HubModule,
    ProfileModule,
    PlatformAuthorizationPolicyModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    NamingModule,
  ],
  providers: [
    InnovationHxbService,
    InnovationHxbFieldResolver,
    InnovationHxbResolverMutations,
    InnovationHxbAuthorizationService,
  ],
  exports: [InnovationHxbService, InnovationHxbAuthorizationService],
})
export class InnovationHxbModule {}

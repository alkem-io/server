import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { InnovationPack } from './innovation.pack.entity';
import { InnovationPackService } from './innovaton.pack.service';
import { InnovationPackAuthorizationService } from './innovation.pack.service.authorization';
import { InnovationPackResolverFields } from './innovation.pack.resolver.fields';
import { InnovationPackResolverMutations } from './innovation.pack.resolver.mutations';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { ProfileModule } from '@domain/common/profile/profile.module';

@Module({
  imports: [
    TemplatesSetModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    OrganizationModule,
    ProfileModule,
    AgentModule,
    TypeOrmModule.forFeature([InnovationPack]),
  ],
  providers: [
    InnovationPackService,
    InnovationPackAuthorizationService,
    InnovationPackResolverFields,
    InnovationPackResolverMutations,
  ],
  exports: [InnovationPackService, InnovationPackAuthorizationService],
})
export class InnovationPackModule {}

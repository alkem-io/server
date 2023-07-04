import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationFlow } from './innovation.flow.entity';
import { InnovationFlowService } from './innovaton.flow.service';
import { InnovationFlowAuthorizationService } from './innovation.flow.service.authorization';
import { InnovationFlowResolverFields } from './innovation.flow.resolver.fields';
import { InnovationFlowResolverMutations } from './innovation.flow.resolver.mutations';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { InnovationFlowTemplateModule } from '@domain/template/innovation-flow-template/innovation.flow.template.module';
import { InnovationFlowLifecycleOptionsProviderChallenge } from './innovation.flow.lifecycle.options.provider.challenge';
import { InnovationFlowLifecycleOptionsProviderOpportunity } from './innovation.flow.lifecycle.options.provider.opportunity';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    LifecycleModule,
    InnovationFlowTemplateModule,
    ProfileModule,
    TypeOrmModule.forFeature([InnovationFlow]),
  ],
  providers: [
    InnovationFlowService,
    InnovationFlowAuthorizationService,
    InnovationFlowResolverFields,
    InnovationFlowResolverMutations,
    InnovationFlowLifecycleOptionsProviderChallenge,
    InnovationFlowLifecycleOptionsProviderOpportunity,
  ],
  exports: [InnovationFlowService, InnovationFlowAuthorizationService],
})
export class InnovationFlowModule {}

import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { InnovationFlowTemplate } from './innovation.flow.template.entity';
import { InnovationFlowTemplateResolverMutations } from './innovation.flow.template.resolver.mutations';
import { InnovationFlowTemplateService } from './innovation.flow.template.service';
import { InnovationFlowTemplateAuthorizationService } from './innovation.flow.template.service.authorization';
import { InnovationFlowStatesModule } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.module';
import { InnovationFlowTemplateResolverFields } from './innovation.flow.template.resolver.fields';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    InnovationFlowStatesModule,
    ProfileModule,
    TemplateBaseModule,
    TypeOrmModule.forFeature([InnovationFlowTemplate]),
  ],
  providers: [
    InnovationFlowTemplateService,
    InnovationFlowTemplateAuthorizationService,
    InnovationFlowTemplateResolverFields,
    InnovationFlowTemplateResolverMutations,
  ],
  exports: [
    InnovationFlowTemplateService,
    InnovationFlowTemplateAuthorizationService,
  ],
})
export class InnovationFlowTemplateModule {}

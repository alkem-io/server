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

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    TemplateBaseModule,
    TypeOrmModule.forFeature([InnovationFlowTemplate]),
  ],
  providers: [
    InnovationFlowTemplateService,
    InnovationFlowTemplateAuthorizationService,
    InnovationFlowTemplateResolverMutations,
  ],
  exports: [
    InnovationFlowTemplateService,
    InnovationFlowTemplateAuthorizationService,
  ],
})
export class InnovationFlowTemplateModule {}

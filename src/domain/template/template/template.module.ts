import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from './template.entity';
import { TemplateResolverMutations } from './template.resolver.mutations';
import { TemplateService } from './template.service';
import { TemplateAuthorizationService } from './template.service.authorization';
import { InnovationFlowStatesModule } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    InnovationFlowStatesModule,
    ProfileModule,
    TypeOrmModule.forFeature([Template]),
  ],
  providers: [
    TemplateService,
    TemplateAuthorizationService,
    TemplateResolverMutations,
  ],
  exports: [TemplateService, TemplateAuthorizationService],
})
export class TemplateModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationFlow } from './innovation.flow.entity';
import { InnovationFlowService } from './innovation.flow.service';
import { InnovationFlowAuthorizationService } from './innovation.flow.service.authorization';
import { InnovationFlowResolverFields } from './innovation.flow.resolver.fields';
import { InnovationFlowResolverMutations } from './innovation.flow.resolver.mutations';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TagsetTemplateModule } from '@domain/common/tagset-template/tagset.template.module';
import { InnovationFlowStatesModule } from '../innovation-flow-states/innovation.flow.state.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    InnovationFlowStatesModule,
    ProfileModule,
    TagsetTemplateModule,
    TagsetModule,
    TypeOrmModule.forFeature([InnovationFlow]),
  ],
  providers: [
    InnovationFlowService,
    InnovationFlowAuthorizationService,
    InnovationFlowResolverFields,
    InnovationFlowResolverMutations,
  ],
  exports: [InnovationFlowService, InnovationFlowAuthorizationService],
})
export class InnovationFlowModule {}

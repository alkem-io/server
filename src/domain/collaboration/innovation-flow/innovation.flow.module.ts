import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { TagsetTemplateModule } from '@domain/common/tagset-template/tagset.template.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutsSetModule } from '../callouts-set/callouts.set.module';
import { InnovationFlowStateModule } from '../innovation-flow-state/innovation.flow.state.module';
import { InnovationFlow } from './innovation.flow.entity';
import { InnovationFlowResolverFields } from './innovation.flow.resolver.fields';
import { InnovationFlowResolverMutations } from './innovation.flow.resolver.mutations';
import { InnovationFlowService } from './innovation.flow.service';
import { InnovationFlowAuthorizationService } from './innovation.flow.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CalloutsSetModule,
    InnovationFlowStateModule,
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

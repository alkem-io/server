import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { InnovationFlowStateService } from './innovation.flow.state.service';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InnovationFlowStateAuthorizationService } from './innovation.flow.state.service.authorization';
import { InnovationFlowStateResolverFields } from './innovation.flow.state.resolver.fields';
import { Template } from '@domain/template/template/template.entity';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([InnovationFlowState, Template]),
  ],
  providers: [
    InnovationFlowStateService,
    InnovationFlowStateAuthorizationService,
    InnovationFlowStateResolverFields,
  ],
  exports: [
    InnovationFlowStateService,
    InnovationFlowStateAuthorizationService,
  ],
})
export class InnovationFlowStateModule {}

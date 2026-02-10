import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Template } from '@domain/template/template/template.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { InnovationFlowStateResolverFields } from './innovation.flow.state.resolver.fields';
import { InnovationFlowStateService } from './innovation.flow.state.service';
import { InnovationFlowStateAuthorizationService } from './innovation.flow.state.service.authorization';

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

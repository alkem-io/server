import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { InnovationFlowStateResolverFields } from './innovation.flow.state.resolver.fields';
import { InnovationFlowStateService } from './innovation.flow.state.service';
import { InnovationFlowStateAuthorizationService } from './innovation.flow.state.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
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

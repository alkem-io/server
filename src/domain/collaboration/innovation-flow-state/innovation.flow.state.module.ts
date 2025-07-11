import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { InnovationFlowStateService } from './innovation.flow.state.service';
import { InnovationFlowStateResolverMutations } from './innovation.flow.state.resolver.mutations';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([InnovationFlowState]),
  ],
  providers: [InnovationFlowStateService, InnovationFlowStateResolverMutations],
  exports: [InnovationFlowStateService],
})
export class InnovationFlowStateModule {}

import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { TemplateModule } from '../template/template.module';
import { TemplateApplierResolverMutations } from './template.applier.resolver.mutations';
import { TemplateApplierService } from './template.applier.service';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TemplateModule,
    CollaborationModule,
    CalloutsSetModule,
    CalloutModule,
    StorageAggregatorResolverModule,
    InnovationFlowModule,
    InputCreatorModule,
  ],
  providers: [TemplateApplierService, TemplateApplierResolverMutations],
  exports: [],
})
export class TemplateApplierModule {}

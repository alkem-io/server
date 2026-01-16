import { Module } from '@nestjs/common';
import { TemplateApplierService } from './template.applier.service';
import { TemplateApplierResolverMutations } from './template.applier.resolver.mutations';
import { TemplateModule } from '../template/template.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';

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

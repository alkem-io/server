import { Module } from '@nestjs/common';
import { TemplateApplierService } from './template.applier.service';
import { TemplateApplierResolverMutations } from './template.applier.resolver.mutations';
import { TemplateModule } from '../template/template.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TemplateModule,
    CollaborationModule,
    InnovationFlowModule,
    InputCreatorModule,
    StorageAggregatorResolverModule,
    CalloutModule,
    NamingModule,
  ],
  providers: [TemplateApplierService, TemplateApplierResolverMutations],
  exports: [],
})
export class TemplateApplierModule {}

import { Module } from '@nestjs/common';
import { TemplateApplierService } from './template.applier.service';
import { TemplateApplierResolverMutations } from './template.applier.resolver.mutations';
import { TemplateModule } from '../template/template.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';

@Module({
  imports: [
    AuthorizationModule,
    TemplateModule,
    CollaborationModule,
    InnovationFlowModule,
  ],
  providers: [TemplateApplierService, TemplateApplierResolverMutations],
  exports: [],
})
export class TemplateApplierModule {}

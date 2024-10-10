import { Module } from '@nestjs/common';
import { TemplateApplierService } from './template.applier.service';
import { TemplateApplierResolverMutations } from './template.applier.resolver.mutations';
import { TemplateModule } from '../template/template.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [AuthorizationModule, TemplateModule, InnovationFlowModule],
  providers: [TemplateApplierService, TemplateApplierResolverMutations],
  exports: [],
})
export class TemplateApplierModule {}

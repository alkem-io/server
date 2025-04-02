import { Module } from '@nestjs/common';
import { TemplateApplierService } from './template.applier.service';
import { TemplateApplierResolverMutations } from './template.applier.resolver.mutations';
import { TemplateModule } from '../template/template.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TemplateModule,
    CollaborationModule,
    CalloutsSetModule,
  ],
  providers: [TemplateApplierService, TemplateApplierResolverMutations],
  exports: [],
})
export class TemplateApplierModule {}

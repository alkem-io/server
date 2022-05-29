import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { Module } from '@nestjs/common';
import { TemplateBaseService } from './template.base.service';
import { TemplateBaseAuthorizationService } from './template.base.service.authorization';

@Module({
  imports: [AuthorizationPolicyModule, VisualModule, TagsetModule],
  providers: [TemplateBaseService, TemplateBaseAuthorizationService],
  exports: [TemplateBaseService, TemplateBaseAuthorizationService],
})
export class TemplateBaseModule {}

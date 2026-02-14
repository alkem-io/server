import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TemplateModule } from '../template/template.module';
import { TemplateDefaultResolverFields } from './template.default.resolver.fields';
import { TemplateDefaultService } from './template.default.service';
import { TemplateDefaultAuthorizationService } from './template.default.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateModule,
  ],
  providers: [
    TemplateDefaultService,
    TemplateDefaultAuthorizationService,
    TemplateDefaultResolverFields,
  ],
  exports: [TemplateDefaultService, TemplateDefaultAuthorizationService],
})
export class TemplateDefaultModule {}

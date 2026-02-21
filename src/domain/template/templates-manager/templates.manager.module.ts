import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InheritedCredentialRuleSetModule } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateModule } from '../template/template.module';
import { TemplateDefaultModule } from '../template-default/template.default.module';
import { TemplatesSetModule } from '../templates-set/templates.set.module';
import { TemplatesManager } from './templates.manager.entity';
import { TemplatesManagerResolverFields } from './templates.manager.resolver.fields';
import { TemplatesManagerResolverMutations } from './templates.manager.resolver.mutations';
import { TemplatesManagerService } from './templates.manager.service';
import { TemplatesManagerAuthorizationService } from './templates.manager.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    InheritedCredentialRuleSetModule,
    TemplatesSetModule,
    TemplateDefaultModule,
    TemplateModule,
    TypeOrmModule.forFeature([TemplatesManager]),
  ],
  providers: [
    TemplatesManagerService,
    TemplatesManagerAuthorizationService,
    TemplatesManagerResolverFields,
    TemplatesManagerResolverMutations,
  ],
  exports: [
    TemplatesManagerService,
    TemplatesManagerAuthorizationService,
    TemplatesManagerResolverFields,
  ],
})
export class TemplatesManagerModule {}

import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesManager } from './templates.manager.entity';
import { TemplatesManagerResolverFields } from './templates.manager.resolver.fields';
import { TemplatesManagerService } from './templates.manager.service';
import { TemplatesManagerAuthorizationService } from './templates.manager.service.authorization';
import { TemplatesSetModule } from '../templates-set/templates.set.module';
import { TemplateDefaultModule } from '../template-default/template.default.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TemplatesSetModule,
    TemplateDefaultModule,
    TypeOrmModule.forFeature([TemplatesManager]),
  ],
  providers: [
    TemplatesManagerService,
    TemplatesManagerAuthorizationService,
    TemplatesManagerResolverFields,
  ],
  exports: [
    TemplatesManagerService,
    TemplatesManagerAuthorizationService,
    TemplatesManagerResolverFields,
  ],
})
export class TemplatesManagerModule {}

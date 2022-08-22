import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateInfo } from './template.info.entity';
import { TemplateInfoResolverFields } from './template.info.resolver.fields';
import { TemplateInfoService } from './template.info.service';
import { TemplateInfoAuthorizationService } from './template.info.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    VisualModule,
    TagsetModule,
    TypeOrmModule.forFeature([TemplateInfo]),
  ],
  providers: [
    TemplateInfoService,
    TemplateInfoAuthorizationService,
    TemplateInfoResolverFields,
  ],
  exports: [TemplateInfoService, TemplateInfoAuthorizationService],
})
export class TemplateInfoModule {}

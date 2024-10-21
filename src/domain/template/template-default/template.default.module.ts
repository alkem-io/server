import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateDefault } from './template.default.entity';
import { TemplateDefaultService } from './template.default.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { TemplateModule } from '../template/template.module';
import { TemplateDefaultAuthorizationService } from './template.default.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateModule,
    TypeOrmModule.forFeature([TemplateDefault]),
  ],
  providers: [TemplateDefaultService, TemplateDefaultAuthorizationService],
  exports: [TemplateDefaultService, TemplateDefaultAuthorizationService],
})
export class TemplateDefaultModule {}

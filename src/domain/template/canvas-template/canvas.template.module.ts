import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { TemplateInfoModule } from '../template-info/template.info.module';
import { CanvasTemplate } from './canvas.template.entity';
import { CanvasTemplateResolverMutations } from './canvas.template.resolver.mutations';
import { CanvasTemplateService } from './canvas.template.service';
import { CanvasTemplateAuthorizationService } from './canvas.template.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateBaseModule,
    TemplateInfoModule,
    TypeOrmModule.forFeature([CanvasTemplate]),
  ],
  providers: [
    CanvasTemplateService,
    CanvasTemplateAuthorizationService,
    CanvasTemplateResolverMutations,
  ],
  exports: [CanvasTemplateService, CanvasTemplateAuthorizationService],
})
export class CanvasTemplateModule {}

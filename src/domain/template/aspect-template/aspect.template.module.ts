import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { AspectTemplate } from './aspect.template.entity';
import { AspectTemplateResolverMutations } from './aspect.template.resolver.mutations';
import { AspectTemplateService } from './aspect.template.service';
import { AspectTemplateAuthorizationService } from './aspect.template.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateBaseModule,
    ProfileModule,
    TypeOrmModule.forFeature([AspectTemplate]),
  ],
  providers: [
    AspectTemplateService,
    AspectTemplateAuthorizationService,
    AspectTemplateResolverMutations,
  ],
  exports: [AspectTemplateService, AspectTemplateAuthorizationService],
})
export class AspectTemplateModule {}

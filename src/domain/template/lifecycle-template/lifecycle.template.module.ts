import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { LifecycleTemplate } from './lifecycle.template.entity';
import { LifecycleTemplateResolverMutations } from './lifecycle.template.resolver.mutations';
import { LifecycleTemplateService } from './lifecycle.template.service';
import { LifecycleTemplateAuthorizationService } from './lifecycle.template.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    TemplateBaseModule,
    TypeOrmModule.forFeature([LifecycleTemplate]),
  ],
  providers: [
    LifecycleTemplateService,
    LifecycleTemplateAuthorizationService,
    LifecycleTemplateResolverMutations,
  ],
  exports: [LifecycleTemplateService, LifecycleTemplateAuthorizationService],
})
export class LifecycleTemplateModule {}

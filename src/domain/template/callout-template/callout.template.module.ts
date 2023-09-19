import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutFramingModule } from '@domain/collaboration/callout-framing/callout.framing.module';
import { CalloutContributionDefaultsModule } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.module';
import { CalloutContributionPolicyModule } from '@domain/collaboration/callout-contribution-policy/callout.contribution.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { CalloutTemplateService } from './callout.template.service';
import { CalloutTemplateAuthorizationService } from './callout.template.service.authorization';
import { CalloutTemplate } from './callout.template.entity';
import { CalloutTemplateResolverMutations } from './callout.template.resolver.mutations';
@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateBaseModule,
    ProfileModule,
    CalloutFramingModule,
    CalloutContributionDefaultsModule,
    CalloutContributionPolicyModule,
    TypeOrmModule.forFeature([CalloutTemplate]),
  ],
  providers: [
    CalloutTemplateService,
    CalloutTemplateAuthorizationService,
    CalloutTemplateResolverMutations,
  ],
  exports: [CalloutTemplateService, CalloutTemplateAuthorizationService],
})
export class CalloutTemplateModule {}

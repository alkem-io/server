import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { CalloutTemplate } from './callout.template.entity';
import { CalloutTemplateResolverMutations } from './callout.template.resolver.mutations';
import { CalloutTemplateService } from './callout.template.service';
import { CalloutTemplateAuthorizationService } from './callout.template.service.authorization';
import { CalloutFramingModule } from '@domain/collaboration/callout-framing/callout.framing.module';
import { CalloutResponseDefaultsModule } from '@domain/collaboration/callout-response-defaults/callout.response.defaults.module';
import { CalloutResponsePolicyModule } from '@domain/collaboration/callout-response-policy/callout.response.policy.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateBaseModule,
    ProfileModule,
    CalloutFramingModule,
    CalloutResponseDefaultsModule,
    CalloutResponsePolicyModule,
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

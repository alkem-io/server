import { Module } from '@nestjs/common';
import { CalloutSettingsService } from './callout.settings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutSettings } from './callout.settings.entity';
import { CalloutSettingsAuthorizationService } from './callout.settings.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CalloutSettingsResolverFields } from './callout.settings.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutSettingsFramingModule } from '../callout-settings-framing/callout.settings.framing.module';
import { CalloutSettingsContributionModule } from '../callout-settings-contribution/callout.settings.contribution.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CalloutSettingsContributionModule,
    CalloutSettingsFramingModule,
    TypeOrmModule.forFeature([CalloutSettings]),
  ],
  providers: [
    CalloutSettingsService,
    CalloutSettingsAuthorizationService,
    CalloutSettingsResolverFields,
  ],
  exports: [CalloutSettingsService, CalloutSettingsAuthorizationService],
})
export class CalloutSettingsModule {}

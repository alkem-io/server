import { Module } from '@nestjs/common';
import { CalloutSettingsService } from './callout.settings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutSettings } from './callout.settings.entity';
import { CalloutSettingsAuthorizationService } from './callout.settings.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CalloutSettingsResolverFields } from './callout.settings.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { CalloutSettingsContributionModule } from '../callout-settings-contribution/callout.settings.contribution.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CalloutSettingsContributionModule,
    /*ProfileModule,
    TagsetModule,
    WhiteboardModule,
    NamingModule,*/
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

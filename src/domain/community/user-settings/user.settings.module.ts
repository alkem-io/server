import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSettingsCommunicationResolverFields } from './user.settings.communications.resolver.fields';
import { UserSettings } from './user.settings.entity';
import { UserSettingsHomeSpaceValidationService } from './user.settings.home.space.validation.service';
import { UserSettingsService } from './user.settings.service';
import { UserSettingsAuthorizationService } from './user.settings.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    SpaceLookupModule,
    TypeOrmModule.forFeature([UserSettings]),
  ],
  providers: [
    UserSettingsService,
    UserSettingsAuthorizationService,
    UserSettingsHomeSpaceValidationService,
    UserSettingsCommunicationResolverFields,
  ],
  exports: [
    UserSettingsService,
    UserSettingsAuthorizationService,
    UserSettingsHomeSpaceValidationService,
  ],
})
export class UserSettingsModule {}

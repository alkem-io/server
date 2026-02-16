import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { UserSettingsHomeSpaceValidationService } from './user.settings.home.space.validation.service';
import { UserSettingsService } from './user.settings.service';
import { UserSettingsAuthorizationService } from './user.settings.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    SpaceLookupModule,
  ],
  providers: [
    UserSettingsService,
    UserSettingsAuthorizationService,
    UserSettingsHomeSpaceValidationService,
  ],
  exports: [
    UserSettingsService,
    UserSettingsAuthorizationService,
    UserSettingsHomeSpaceValidationService,
  ],
})
export class UserSettingsModule {}

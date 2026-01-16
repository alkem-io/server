import { Module } from '@nestjs/common';
import { UserSettingsService } from './user.settings.service';
import { UserSettings } from './user.settings.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserSettingsAuthorizationService } from './user.settings.service.authorization';
import { UserSettingsHomeSpaceValidationService } from './user.settings.home.space.validation.service';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';

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
  ],
  exports: [
    UserSettingsService,
    UserSettingsAuthorizationService,
    UserSettingsHomeSpaceValidationService,
  ],
})
export class UserSettingsModule {}

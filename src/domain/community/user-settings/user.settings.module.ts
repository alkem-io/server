import { Module } from '@nestjs/common';
import { UserSettingsService } from './user.settings.service';
import { UserSettings } from './user.settings.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserSettingsAuthorizationService } from './user.settings.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([UserSettings]),
  ],
  providers: [UserSettingsService, UserSettingsAuthorizationService],
  exports: [UserSettingsService, UserSettingsAuthorizationService],
})
export class UserSettingsModule {}

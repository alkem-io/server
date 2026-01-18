import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSettings } from './user.settings.entity';
import { UserSettingsService } from './user.settings.service';
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

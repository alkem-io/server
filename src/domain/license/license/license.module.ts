import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { License } from './license.entity';
import { LicenseService } from './license.service';
import { LicenseAuthorizationService } from './license.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([License]),
  ],
  providers: [LicenseService, LicenseAuthorizationService],
  exports: [LicenseService, LicenseAuthorizationService],
})
export class LicenseModule {}

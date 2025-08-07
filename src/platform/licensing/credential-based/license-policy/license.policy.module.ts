import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensePolicy } from './license.policy.entity';
import { LicensePolicyService } from './license.policy.service';
import { LicensePolicyAuthorizationService } from './license.policy.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([LicensePolicy]),
  ],
  providers: [LicensePolicyService, LicensePolicyAuthorizationService],
  exports: [LicensePolicyService, LicensePolicyAuthorizationService],
})
export class LicensePolicyModule {}

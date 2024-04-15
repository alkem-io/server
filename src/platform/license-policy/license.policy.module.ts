import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensePolicy } from './license.policy.entity';
import { LicensePolicyResolverFields } from './license.policy.resolver.fields';

import { LicensePolicyService } from './license.policy.service';
import { LicensePolicyAuthorizationService } from './license.policy.service.authorization';

@Module({
  imports: [TypeOrmModule.forFeature([LicensePolicy])],
  providers: [
    LicensePolicyService,
    LicensePolicyResolverFields,
    LicensePolicyAuthorizationService,
  ],
  exports: [LicensePolicyService, LicensePolicyAuthorizationService],
})
export class LicensePolicyModule {}

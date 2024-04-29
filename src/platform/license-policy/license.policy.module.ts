import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensePolicy } from './license.policy.entity';
import { LicensePolicyResolverFields } from './license.policy.resolver.fields';

import { LicensePolicyService } from './license.policy.service';
import { LicensePolicyAuthorizationService } from './license.policy.service.authorization';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    LicenseEngineModule,
    TypeOrmModule.forFeature([LicensePolicy]),
  ],
  providers: [
    LicensePolicyService,
    LicensePolicyResolverFields,
    LicensePolicyAuthorizationService,
  ],
  exports: [LicensePolicyService, LicensePolicyAuthorizationService],
})
export class LicensePolicyModule {}

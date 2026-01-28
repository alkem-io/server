import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { LicenseEntitlementModule } from '../license-entitlement/license.entitlement.module';
import { License } from './license.entity';
import { LicenseResolverFields } from './license.resolver.fields';
import { LicenseService } from './license.service';
import { LicenseAuthorizationService } from './license.service.authorization';

@Module({
  imports: [
    LicenseEntitlementModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([License]),
  ],
  providers: [
    LicenseService,
    LicenseResolverFields,
    LicenseAuthorizationService,
  ],
  exports: [LicenseService, LicenseAuthorizationService],
})
export class LicenseModule {}

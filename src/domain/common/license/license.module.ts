import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { License } from './license.entity';
import { LicenseResolverFields } from './license.resolver.fields';
import { LicenseService } from './license.service';
import { EntitlementModule } from '../license-entitlement/entitlement.module';
import { LicenseAuthorizationService } from './license.service.authorization';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';

@Module({
  imports: [
    EntitlementModule,
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

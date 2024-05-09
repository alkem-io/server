import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { License } from './license.entity';
import { LicenseResolverFields } from './license.resolver.fields';
import { LicenseService } from './license.service';
import { LicenseAuthorizationService } from './license.service.authorization';
import { FeatureFlagService } from '../feature-flag/feature.flag.service';
import { FeatureFlag } from '../feature-flag/feature.flag.entity';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';

@Module({
  imports: [
    AuthorizationModule,
    LicenseEngineModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([License]),
    TypeOrmModule.forFeature([FeatureFlag]),
  ],
  providers: [
    LicenseResolverFields,
    LicenseService,
    LicenseAuthorizationService,
    FeatureFlagService,
  ],
  exports: [LicenseService, LicenseAuthorizationService],
})
export class LicenseModule {}

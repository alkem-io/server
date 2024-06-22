import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Licensing } from './licensing.entity';
import { LicensingResolverFields } from './licensing.resolver.fields';
import { LicensingResolverMutations } from './licensing.resolver.mutations';
import { LicensingService } from './licensing.service';
import { LicensingAuthorizationService } from './licensing.service.authorization';
import { LicensePlanModule } from '@platform/license-plan/license.plan.module';
import { LicensePolicyModule } from '@platform/license-policy/license.policy.module';

@Module({
  imports: [
    LicensePlanModule,
    LicensePolicyModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([Licensing]),
  ],
  providers: [
    LicensingResolverMutations,
    LicensingResolverFields,
    LicensingService,
    LicensingAuthorizationService,
  ],
  exports: [LicensingService, LicensingAuthorizationService],
})
export class LicensingModule {}

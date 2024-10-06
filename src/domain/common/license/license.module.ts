import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { License } from './license.entity';
import { LicenseResolverFields } from './license.resolver.fields';
import { LicenseService } from './license.service';
import { EntitlementModule } from '../license-entitlement/entitlement.module';

@Module({
  imports: [
    EntitlementModule,
    AuthorizationModule,
    TypeOrmModule.forFeature([License]),
  ],
  providers: [LicenseService, LicenseResolverFields],
  exports: [LicenseService],
})
export class LicenseModule {}

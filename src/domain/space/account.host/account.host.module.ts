import { Module } from '@nestjs/common';
import { AccountHostService } from './account.host.service';
import { LicenseIssuerModule } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../account/account.entity';
import { LicenseModule } from '@domain/common/license/license.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';

@Module({
  imports: [
    LicenseIssuerModule,
    LicensingFrameworkModule,
    LicenseModule,
    StorageAggregatorModule,
    TypeOrmModule.forFeature([Account]),
  ],
  providers: [AccountHostService],
  exports: [AccountHostService],
})
export class AccountHostModule {}

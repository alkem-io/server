import { Module } from '@nestjs/common';
import { AccountHostService } from './account.host.service';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { LicenseIssuerModule } from '@platform/license-issuer/license.issuer.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../account/account.entity';
import { LicenseModule } from '@domain/common/license/license.module';
import { LicensingFrameworkModule } from '@platform/licensing-framework/licensing.framework.module';

@Module({
  imports: [
    AgentModule,
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

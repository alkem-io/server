import { AgentModule } from '@domain/agent/agent/agent.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseIssuerModule } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { Account } from '../account/account.entity';
import { AccountHostService } from './account.host.service';

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

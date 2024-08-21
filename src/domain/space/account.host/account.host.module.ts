import { Module } from '@nestjs/common';
import { AccountHostService } from './account.host.service';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { LicenseIssuerModule } from '@platform/license-issuer/license.issuer.module';
import { LicensingModule } from '@platform/licensing/licensing.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../account/account.entity';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { AvatarCreatorModule } from '@services/external/avatar-creator/avatar.creator.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';

@Module({
  imports: [
    AvatarCreatorModule,
    StorageBucketModule,
    ProfileModule,
    ContributorModule,
    AgentModule,
    ContributorLookupModule,
    LicenseIssuerModule,
    LicensingModule,
    StorageAggregatorModule,
    TypeOrmModule.forFeature([Account]),
  ],
  providers: [AccountHostService, ContributorService],
  exports: [AccountHostService],
})
export class AccountHostModule {}

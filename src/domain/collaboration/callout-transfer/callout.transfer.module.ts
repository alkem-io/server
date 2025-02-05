import { Module } from '@nestjs/common';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { CalloutTransferService } from './callout.transfer.service';
import { CalloutsSetModule } from '../callouts-set/callouts.set.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { CalloutModule } from '../callout/callout.module';

@Module({
  imports: [
    StorageAggregatorResolverModule,
    CalloutModule,
    CalloutsSetModule,
    StorageBucketModule,
    ProfileModule,
    TagsetModule,
  ],
  providers: [CalloutTransferService],
  exports: [CalloutTransferService],
})
export class CalloutTransferModule {}

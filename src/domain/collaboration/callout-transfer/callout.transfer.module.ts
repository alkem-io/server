import { Module } from '@nestjs/common';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { CalloutTransferService } from './callout.transfer.service';
import { CalloutsSetModule } from '../callouts-set/callouts.set.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { CalloutModule } from '../callout/callout.module';
import { CalloutTransferResolverMutations } from './callout.transfer.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    StorageAggregatorResolverModule,
    CalloutModule,
    CalloutsSetModule,
    StorageBucketModule,
    ProfileModule,
    TagsetModule,
    NamingModule,
  ],
  providers: [CalloutTransferService, CalloutTransferResolverMutations],
  exports: [CalloutTransferService],
})
export class CalloutTransferModule {}

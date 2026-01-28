import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { CalloutModule } from '../callout/callout.module';
import { CalloutsSetModule } from '../callouts-set/callouts.set.module';
import { CalloutTransferResolverMutations } from './callout.transfer.resolver.mutations';
import { CalloutTransferService } from './callout.transfer.service';

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
    EntityResolverModule,
  ],
  providers: [CalloutTransferService, CalloutTransferResolverMutations],
  exports: [CalloutTransferService],
})
export class CalloutTransferModule {}

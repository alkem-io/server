import { Module } from '@nestjs/common';
import { EntityResolverModule } from '../entity-resolver/entity.resolver.module';
import { StorageAggregatorResolverService } from './storage.aggregator.resolver.service';

@Module({
  imports: [EntityResolverModule],
  providers: [StorageAggregatorResolverService],
  exports: [StorageAggregatorResolverService],
})
export class StorageAggregatorResolverModule {}

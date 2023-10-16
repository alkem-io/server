import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { EntityResolverModule } from '../entity-resolver/entity.resolver.module';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { StorageAggregatorResolverService } from './storage.aggregator.resolver.service';

@Module({
  imports: [
    EntityResolverModule,
    TypeOrmModule.forFeature([StorageBucket]),
    TypeOrmModule.forFeature([StorageAggregator]),
  ],
  providers: [StorageAggregatorResolverService],
  exports: [StorageAggregatorResolverService],
})
export class StorageAggregatorResolverModule {}

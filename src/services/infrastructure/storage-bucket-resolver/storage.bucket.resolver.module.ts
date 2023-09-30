import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageBucketResolverService } from './storage.bucket.resolver.service';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StorageBucket])],
  providers: [StorageBucketResolverService],
  exports: [StorageBucketResolverService],
})
export class StorageBucketResolverModule {}

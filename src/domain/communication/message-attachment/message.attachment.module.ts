import { Document } from '@domain/storage/document/document.entity';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { Conversation } from '../conversation/conversation.entity';
import { MessageAttachmentService } from './message.attachment.service';

@Module({
  imports: [
    StorageBucketModule,
    StorageAggregatorResolverModule,
    EntityResolverModule,
    TypeOrmModule.forFeature([Conversation, Document]),
  ],
  providers: [MessageAttachmentService],
  exports: [MessageAttachmentService],
})
export class MessageAttachmentModule {}

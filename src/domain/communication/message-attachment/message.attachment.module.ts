import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Room } from '@domain/communication/room/room.entity';
import { Document } from '@domain/storage/document/document.entity';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { MessagingRedisModule } from '@services/infrastructure/redis-client/messaging-redis.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { Conversation } from '../conversation/conversation.entity';
import { MessageAttachmentCleanupService } from './message.attachment.cleanup.service';
import { MessageAttachmentService } from './message.attachment.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    DocumentModule,
    StorageBucketModule,
    FileServiceAdapterModule,
    StorageAggregatorResolverModule,
    EntityResolverModule,
    // Supplies MESSAGING_REDIS_CLIENT for the cleanup sweep's cross-replica
    // claim (MessageAttachmentCleanupService). Nest dedupes module imports by
    // class, so this shares the single existing client rather than opening a
    // second connection.
    MessagingRedisModule,
    TypeOrmModule.forFeature([Conversation, Document, Room]),
  ],
  providers: [MessageAttachmentService, MessageAttachmentCleanupService],
  exports: [MessageAttachmentService],
})
export class MessageAttachmentModule {}

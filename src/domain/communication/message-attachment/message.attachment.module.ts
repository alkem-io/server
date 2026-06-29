import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Document } from '@domain/storage/document/document.entity';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
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
    TypeOrmModule.forFeature([Conversation, Document]),
  ],
  providers: [MessageAttachmentService, MessageAttachmentCleanupService],
  exports: [MessageAttachmentService],
})
export class MessageAttachmentModule {}

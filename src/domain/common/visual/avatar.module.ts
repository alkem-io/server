import { Module } from '@nestjs/common';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { VisualModule } from './visual.module';
import { AvatarService } from './avatar.service';

@Module({
  imports: [VisualModule, StorageBucketModule, DocumentModule],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule {}

import { Module } from '@nestjs/common';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { ProfileDocumentsService } from './profile.documents.service';

@Module({
  imports: [DocumentModule, StorageBucketModule, ProfileModule],
  providers: [ProfileDocumentsService],
  exports: [ProfileDocumentsService],
})
export class ProfileDocumentsModule {}

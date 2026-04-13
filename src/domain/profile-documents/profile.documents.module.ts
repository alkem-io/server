import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { ProfileDocumentsService } from './profile.documents.service';

@Module({
  imports: [
    DocumentModule,
    StorageBucketModule,
    AuthorizationPolicyModule,
    FileServiceAdapterModule,
  ],
  providers: [ProfileDocumentsService],
  exports: [ProfileDocumentsService],
})
export class ProfileDocumentsModule {}

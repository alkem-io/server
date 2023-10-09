import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AdminWhiteboardResolverMutations } from './admin.whiteboard.resolver.mutations';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { AdminWhiteboardService } from './admin.whiteboard.service';

@Module({
  imports: [AuthorizationModule, StorageBucketModule, DocumentModule],
  providers: [AdminWhiteboardService, AdminWhiteboardResolverMutations],
  exports: [AdminWhiteboardService],
})
export class AdminWhiteboardModule {}

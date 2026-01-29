import { AuthorizationModule } from '@core/authorization/authorization.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AdminWhiteboardResolverMutations } from './admin.whiteboard.resolver.mutations';
import { AdminWhiteboardService } from './admin.whiteboard.service';

@Module({
  imports: [
    StorageBucketModule,
    DocumentModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
  ],
  providers: [AdminWhiteboardService, AdminWhiteboardResolverMutations],
  exports: [AdminWhiteboardService],
})
export class AdminWhiteboardModule {}

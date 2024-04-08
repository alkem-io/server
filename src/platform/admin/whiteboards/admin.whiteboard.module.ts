import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { AdminWhiteboardService } from './admin.whiteboard.service';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AdminWhiteboardResolverMutations } from './admin.whiteboard.resolver.mutations';

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

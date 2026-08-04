import { AuthorizationModule } from '@core/authorization/authorization.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { PlatformOperationsAuditModule } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.module';
import { AdminWhiteboardResolverMutations } from './admin.whiteboard.resolver.mutations';
import { AdminWhiteboardService } from './admin.whiteboard.service';

@Module({
  imports: [
    PlatformOperationsAuditModule,
    StorageBucketModule,
    DocumentModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
  ],
  providers: [AdminWhiteboardService, AdminWhiteboardResolverMutations],
  exports: [AdminWhiteboardService],
})
export class AdminWhiteboardModule {}

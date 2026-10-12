import { AuthorizationModule } from '@core/authorization/authorization.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { PlatformOperationsAuditModule } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.module';
import { AdminTemplateFileRepairResolverMutations } from './admin.template.file.repair.resolver.mutations';
import { AdminTemplateFileRepairService } from './admin.template.file.repair.service';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    PlatformOperationsAuditModule,
    ProfileDocumentsModule,
    StorageBucketModule,
    WhiteboardModule,
    FileServiceAdapterModule,
  ],
  providers: [
    AdminTemplateFileRepairService,
    AdminTemplateFileRepairResolverMutations,
  ],
})
export class AdminTemplateFileRepairModule {}

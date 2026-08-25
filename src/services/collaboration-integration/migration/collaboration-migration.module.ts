import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutContributionDefaults } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.entity';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { PlatformOperationsAuditModule } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.module';
import { CollaborationMigrationResolverMutations } from './collaboration-migration.resolver.mutations';
import { CollaborationMigrationService } from './collaboration-migration.service';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    PlatformOperationsAuditModule,
    TypeOrmModule.forFeature([Memo, Whiteboard, CalloutContributionDefaults]),
    FileServiceAdapterModule,
    DocumentModule,
    StorageBucketModule,
  ],
  providers: [
    CollaborationMigrationService,
    CollaborationMigrationResolverMutations,
  ],
})
export class CollaborationMigrationModule {}

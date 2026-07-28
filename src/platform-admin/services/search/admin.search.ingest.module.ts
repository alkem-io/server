import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { SearchIngestModule } from '@services/api/search/ingest';
import { TaskModule } from '@services/task';
import { PlatformOperationsAuditModule } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.module';
import { AdminSearchIngestResolverMutations } from './admin.search.ingest.resolver.mutations';

@Module({
  imports: [
    PlatformOperationsAuditModule,
    SearchIngestModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    TaskModule,
  ],
  providers: [AdminSearchIngestResolverMutations],
  exports: [],
})
export class AdminSearchIngestModule {}
